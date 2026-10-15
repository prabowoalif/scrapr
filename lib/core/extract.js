"use strict";

const { cleanUrl, detect } = require("./detector");

const defaultModules = {
  get bilibili() { return require("../bilibili"); },
  get douyin() { return require("../douyin"); },
  get applemusic() { return require("../applemusic"); },
  get soundcloud() { return require("../soundcloud"); },
  get tiktok() { return require("../tiktok"); },
  get youtube() { return require("../youtube"); },
  get instagram() { return require("../instagram"); },
  get bandcamp() { return require("../bandcamp"); },
  get spotify() { return require("../spotify"); },
  get twitter() { return require("../twitter"); },
  get pinterest() { return require("../pinterest"); },
  get facebook() { return require("../facebook"); },
  get threads() { return require("../threads"); },
  get pixiv() { return require("../pixiv"); },
  get rednote() { return require("../rednote"); },
  get reddit() { return require("../reddit"); },
  get terabox() { return require("../terabox"); },
  get resolver() { return require("../resolver"); },
};

/**
 * Execute a promise with an optional timeout in milliseconds.
 */
function withTimeout(promise, timeoutMs) {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Timeout of ${timeoutMs}ms exceeded`)),
      timeoutMs,
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

/**
 * Universally extract media or resolve links with automatic platform detection and smart fallback.
 *
 * @param {string} rawUrl - Target URL to extract from
 * @param {Object} [options] - Extraction options
 * @param {string} [options.platform] - Override detected platform
 * @param {string} [options.method] - Override primary scraper method
 * @param {boolean} [options.fallback=true] - Enable fallback to alternate methods if primary fails
 * @param {string[]} [options.methods] - Custom explicit array of scraper methods to try in order
 * @param {number} [options.timeout] - Timeout per attempt in milliseconds
 * @param {boolean} [options.autoUnshorten=true] - Automatically unshorten shortlinks & gateways and extract target media
 * @param {boolean} [options.fallbackToUnshorten=true] - If domain is unknown, attempt HTTP unshorten to discover real URL
 * @param {Function} [options.onAttempt] - Callback invoked before each method execution
 * @param {Object} [options.methodOptions] - Additional options forwarded to scraper methods
 * @param {Object} [customModules] - Custom scraper modules (optional)
 * @returns {Promise<Object>} Unified response object
 */
async function extract(rawUrl, options = {}, customModules = null) {
  const modules = customModules || defaultModules;
  const url = cleanUrl(rawUrl);

  if (!url) {
    return {
      status: false,
      platform: null,
      message: "Invalid or empty URL provided.",
    };
  }

  let detection = detect(url);

  // If unknown platform, try fallback unshortening to find the real destination
  if (
    !detection.status &&
    options.fallbackToUnshorten !== false &&
    !options.platform
  ) {
    try {
      const unshortenRes = await modules.resolver.unshorten(url);
      if (
        unshortenRes.status &&
        unshortenRes.result &&
        unshortenRes.result.destinationUrl &&
        unshortenRes.result.destinationUrl !== url
      ) {
        const destDetection = detect(unshortenRes.result.destinationUrl);
        if (destDetection.status) {
          detection = destDetection;
          // Mark that this was unshortened from an original URL
          detection._unshortenedFrom = {
            originalUrl: url,
            destinationUrl: unshortenRes.result.destinationUrl,
            hops: unshortenRes.result.hops,
          };
        }
      }
    } catch (_) {}
  }

  // Handle explicit platform override
  const platform = options.platform || detection.platform;
  if (!platform) {
    return {
      status: false,
      platform: null,
      message: detection.error || `Unsupported platform or domain for URL: ${url}`,
      url,
    };
  }

  // Handle automatic shortlink / link gateway unfolding
  if (
    (detection.type === "shortlink" || detection.type === "link_gateway") &&
    options.autoUnshorten !== false &&
    !options.method
  ) {
    try {
      const resolverFn = modules.resolver[detection.method];
      if (typeof resolverFn === "function") {
        const resolverRes = await withTimeout(
          resolverFn(url, options.methodOptions),
          options.timeout,
        );

        if (resolverRes.status && resolverRes.result) {
          const destinationUrl =
            resolverRes.result.destinationUrl || resolverRes.result.url;

          if (destinationUrl && destinationUrl !== url) {
            const destDetection = detect(destinationUrl);
            // If the destination is a media platform (e.g. TikTok, IG, MediaFire, Spotify, etc.)
            if (destDetection.status && destDetection.name !== "shortlink") {
              const subResult = await extract(destinationUrl, {
                ...options,
                autoUnshorten: false, // prevent infinite loop
              }, modules);

              if (subResult.status && subResult.result) {
                return {
                  ...subResult,
                  originalUrl: url,
                  unshortened: {
                    originalUrl: url,
                    destinationUrl,
                    hops: resolverRes.result.hops || [url, destinationUrl],
                  },
                };
              }
            }
          }

          // Otherwise, return unshortened / gateway result directly
          return {
            status: true,
            platform: "resolver",
            method: detection.method,
            result: resolverRes.result,
          };
        }
      }
    } catch (err) {
      // Continue to regular fallback if autoUnshorten fails
    }
  }

  // Build the list of scraper methods to attempt
  let methodsToTry = [];
  if (Array.isArray(options.methods) && options.methods.length > 0) {
    methodsToTry = [...options.methods];
  } else {
    const primaryMethod = options.method || detection.method;
    if (options.fallback === false) {
      methodsToTry = primaryMethod ? [primaryMethod] : [];
    } else {
      const candidates = [
        primaryMethod,
        ...(detection.fallbackMethods || []),
      ].filter(Boolean);
      // Deduplicate methods preserving order
      methodsToTry = Array.from(new Set(candidates));
    }
  }

  if (methodsToTry.length === 0) {
    return {
      status: false,
      platform,
      message: `No scraper methods found or specified for platform "${platform}".`,
    };
  }

  const errors = [];
  const targetUrl = detection._unshortenedFrom?.destinationUrl || url;

  for (let i = 0; i < methodsToTry.length; i++) {
    const method = methodsToTry[i];
    const platformModule = modules[platform];
    const scraperFn = platformModule ? platformModule[method] : null;

    if (typeof scraperFn !== "function") {
      errors.push({
        method,
        message: `Method "${method}" is not a function on platform "${platform}".`,
      });
      continue;
    }

    if (typeof options.onAttempt === "function") {
      try {
        options.onAttempt({
          platform,
          method,
          attempt: i + 1,
          totalAttempts: methodsToTry.length,
          url: targetUrl,
        });
      } catch (_) {}
    }

    const startTime = Date.now();
    try {
      const res = await withTimeout(
        scraperFn(targetUrl, options.methodOptions),
        options.timeout,
      );

      const durationMs = Date.now() - startTime;

      if (res && res.status === true && res.result) {
        const output = {
          status: true,
          platform,
          method,
          durationMs,
          attemptsCount: i + 1,
          result: res.result,
        };

        if (detection._unshortenedFrom) {
          output.unshortened = detection._unshortenedFrom;
        }

        return output;
      }

      // Upstream reported failure
      const errMsg = res?.message || "Unknown scraper failure";
      errors.push({ method, message: errMsg, durationMs });
    } catch (err) {
      const durationMs = Date.now() - startTime;
      errors.push({ method, message: err.message, durationMs });
    }
  }

  const errorSummary = errors
    .map((e) => `[${e.method}: ${e.message}]`)
    .join(", ");

  return {
    status: false,
    platform,
    message: `All scrapers failed for ${platform}. ${errorSummary}`,
    errors,
    attemptsCount: methodsToTry.length,
  };
}

/**
 * Alias for extract, specifically intuitive for link resolvers and unshorteners.
 */
function resolve(url, options = {}, customModules = null) {
  return extract(url, options, customModules);
}

module.exports = {
  extract,
  resolve,
  defaultModules,
};
