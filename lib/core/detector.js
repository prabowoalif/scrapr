"use strict";

/**
 * Universal Platform Detector for scrapr
 * Automatically normalizes URLs, identifies platform, and determines primary/fallback scraper methods.
 */

function cleanUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const match = rawUrl.match(/https?:\/\/[^\s]+/i);
  let clean = match ? match[0] : rawUrl.trim();
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = "https://" + clean;
  }
  return clean;
}

const COMMON_SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "cutt.ly",
  "dub.sh",
  "aka.ms",
  "is.gd",
  "v.gd",
  "shorturl.at",
  "s.id",
  "linktr.ee",
  "rb.gy",
  "buff.ly",
  "ow.ly",
  "bl.ink",
  "t.ly",
  "snip.ly",
  "rebrand.ly",
  "clck.ru",
  "qr.ae",
  "adf.ly",
  "trib.al",
]);

const PLATFORM_RULES = [
  // --- Resolvers & File Hosts (Check first for exact host matches) ---
  {
    name: "mediafire",
    platform: "resolver",
    defaultMethod: "mediafire",
    methods: ["mediafire"],
    type: "file_host",
    match: (urlObj) => /(?:^|\.)mediafire\.com$/i.test(urlObj.hostname),
  },
  {
    name: "sfile",
    platform: "resolver",
    defaultMethod: "sfile",
    methods: ["sfile"],
    type: "file_host",
    match: (urlObj) => /(?:^|\.)sfile\.(?:co|mobi)$/i.test(urlObj.hostname),
  },
  {
    name: "pixeldrain",
    platform: "resolver",
    defaultMethod: "pixeldrain",
    methods: ["pixeldrain"],
    type: "file_host",
    match: (urlObj) => /(?:^|\.)pixeldrain\.com$/i.test(urlObj.hostname),
  },
  {
    name: "catbox",
    platform: "resolver",
    defaultMethod: "catbox",
    methods: ["catbox"],
    type: "file_host",
    match: (urlObj) =>
      /(?:^|\.)(?:catbox\.moe|litterbox\.catbox\.moe)$/i.test(urlObj.hostname),
  },
  {
    name: "gdrive",
    platform: "resolver",
    defaultMethod: "gdrive",
    methods: ["gdrive"],
    type: "file_host",
    match: (urlObj) =>
      /(?:drive|docs)\.google\.com$/i.test(urlObj.hostname) &&
      (urlObj.pathname.includes("/file/d/") ||
        urlObj.pathname.includes("/open") ||
        urlObj.searchParams.has("id")),
  },
  {
    name: "krakenfiles",
    platform: "resolver",
    defaultMethod: "krakenfiles",
    methods: ["krakenfiles"],
    type: "file_host",
    match: (urlObj) => /(?:^|\.)krakenfiles\.com$/i.test(urlObj.hostname),
  },
  {
    name: "doodstream",
    platform: "resolver",
    defaultMethod: "doodstream",
    methods: ["doodstream"],
    type: "file_host",
    match: (urlObj) =>
      /(?:^|\.)(?:dood(?:stream)?|ds2play)\.(?:com|to|so|pm|wf|la|ws|pro)$/i.test(
        urlObj.hostname,
      ),
  },
  {
    name: "sub2unlock",
    platform: "resolver",
    defaultMethod: "sub2unlock",
    methods: ["sub2unlock"],
    type: "link_unlocker",
    match: (urlObj) =>
      /(?:^|\.)(?:sub2unlock|sub4unlock)\.(?:com|io|net)$/i.test(urlObj.hostname),
  },
  {
    name: "rekonise",
    platform: "resolver",
    defaultMethod: "rekonise",
    methods: ["rekonise"],
    type: "link_unlocker",
    match: (urlObj) => /(?:^|\.)rekonise\.com$/i.test(urlObj.hostname),
  },
  {
    name: "safelinku",
    platform: "resolver",
    defaultMethod: "safelinku",
    methods: ["safelinku"],
    type: "link_gateway",
    match: (urlObj) =>
      /(?:^|\.)(?:safelinku\.com|sfl\.gl|sfileku\.com)$/i.test(urlObj.hostname),
  },

  // --- Social Media & Streaming Platforms ---
  {
    name: "tiktok",
    platform: "tiktok",
    defaultMethod: "snaptik",
    methods: ["snaptik", "tiktokio", "ssstik", "tikdownloader", "savetik"],
    type: "media",
    match: (urlObj) => /(?:^|\.)tiktok\.com$/i.test(urlObj.hostname),
  },
  {
    name: "douyin",
    platform: "douyin",
    defaultMethod: "direct",
    methods: ["direct"],
    type: "media",
    match: (urlObj) =>
      /(?:^|\.)(?:douyin|iesdouyin)\.com$/i.test(urlObj.hostname),
  },
  {
    name: "instagram",
    platform: "instagram",
    defaultMethod: "direct",
    methods: ["direct", "indown", "snapsave", "snapinsta"],
    type: "media",
    match: (urlObj) =>
      /(?:^|\.)instagram\.com$/i.test(urlObj.hostname) ||
      urlObj.hostname.toLowerCase() === "instagr.am",
  },
  {
    name: "twitter",
    platform: "twitter",
    defaultMethod: "direct",
    methods: ["direct", "tvd", "savetwt", "tweeload"],
    type: "media",
    match: (urlObj) => {
      const host = urlObj.hostname.toLowerCase();
      return (
        host === "x.com" ||
        host === "mobile.twitter.com" ||
        /(?:^|\.)(?:twitter|fxtwitter|vxtwitter|fixupx)\.com$/i.test(host)
      );
    },
  },
  {
    name: "youtube",
    platform: "youtube",
    defaultMethod: (urlObj) =>
      urlObj.pathname.includes("/playlist") || urlObj.searchParams.has("list")
        ? "playlist"
        : "ytmp3",
    methods: (urlObj) =>
      urlObj.pathname.includes("/playlist") || urlObj.searchParams.has("list")
        ? ["playlist"]
        : ["ytmp3", "ytmp3gg"],
    type: (urlObj) =>
      urlObj.pathname.includes("/playlist") || urlObj.searchParams.has("list")
        ? "playlist"
        : "media",
    match: (urlObj) => {
      const host = urlObj.hostname.toLowerCase();
      return (
        host === "youtu.be" ||
        host === "music.youtube.com" ||
        /(?:^|\.)youtube\.com$/i.test(host) ||
        /(?:^|\.)youtube-nocookie\.com$/i.test(host)
      );
    },
  },
  {
    name: "spotify",
    platform: "spotify",
    defaultMethod: "spotisaver",
    methods: ["spotisaver", "spotidown", "spotmate", "soundloaders"],
    type: "media",
    match: (urlObj) => {
      const host = urlObj.hostname.toLowerCase();
      return host === "spotify.link" || /(?:^|\.)spotify\.com$/i.test(host);
    },
  },
  {
    name: "facebook",
    platform: "facebook",
    defaultMethod: "snapsave",
    methods: ["snapsave", "fdown"],
    type: "media",
    match: (urlObj) => {
      const host = urlObj.hostname.toLowerCase();
      return (
        host === "fb.watch" ||
        host === "fb.com" ||
        /(?:^|\.)facebook\.com$/i.test(host)
      );
    },
  },
  {
    name: "bilibili",
    platform: "bilibili",
    defaultMethod: "direct",
    methods: ["direct"],
    type: "media",
    match: (urlObj) => {
      const host = urlObj.hostname.toLowerCase();
      return host === "b23.tv" || /(?:^|\.)bilibili\.(?:com|tv)$/i.test(host);
    },
  },
  {
    name: "pinterest",
    platform: "pinterest",
    defaultMethod: "direct",
    methods: ["direct", "pindown"],
    type: "media",
    match: (urlObj) => {
      const host = urlObj.hostname.toLowerCase();
      return host === "pin.it" || /(?:^|\.)pinterest\.[a-z.]+$/i.test(host);
    },
  },
  {
    name: "bandcamp",
    platform: "bandcamp",
    defaultMethod: "direct",
    methods: ["direct", "bandcampdownloader"],
    type: "media",
    match: (urlObj) => /(?:^|\.)bandcamp\.com$/i.test(urlObj.hostname),
  },
  {
    name: "threads",
    platform: "threads",
    defaultMethod: "threadster",
    methods: ["threadster"],
    type: "media",
    match: (urlObj) => /(?:^|\.)threads\.net$/i.test(urlObj.hostname),
  },
  {
    name: "pixiv",
    platform: "pixiv",
    defaultMethod: "ajax",
    methods: ["ajax"],
    type: "media",
    match: (urlObj) => /(?:^|\.)pixiv\.(?:net|me)$/i.test(urlObj.hostname),
  },
  {
    name: "rednote",
    platform: "rednote",
    defaultMethod: "direct",
    methods: ["direct"],
    type: "media",
    match: (urlObj) => {
      const host = urlObj.hostname.toLowerCase();
      return (
        host === "xhslink.com" ||
        /(?:^|\.)(?:rednote|xiaohongshu)\.com$/i.test(host)
      );
    },
  },
  {
    name: "reddit",
    platform: "reddit",
    defaultMethod: "rapidsave",
    methods: ["rapidsave"],
    type: "media",
    match: (urlObj) => {
      const host = urlObj.hostname.toLowerCase();
      return host === "redd.it" || /(?:^|\.)reddit\.com$/i.test(host);
    },
  },
  {
    name: "applemusic",
    platform: "applemusic",
    defaultMethod: "aplmate",
    methods: ["aplmate"],
    type: "media",
    match: (urlObj) => urlObj.hostname.toLowerCase() === "music.apple.com",
  },
  {
    name: "soundcloud",
    platform: "soundcloud",
    defaultMethod: "klickaud",
    methods: ["klickaud"],
    type: "media",
    match: (urlObj) => {
      const host = urlObj.hostname.toLowerCase();
      return (
        host === "on.soundcloud.com" || /(?:^|\.)soundcloud\.com$/i.test(host)
      );
    },
  },
  {
    name: "terabox",
    platform: "terabox",
    defaultMethod: "sechno",
    methods: ["sechno"],
    type: "cloud_storage",
    match: (urlObj) =>
      /(?:^|\.)(?:terabox(?:app|share|\.link)?|1024tera|mirrobox|nephobox|freeterabox|4funbox|tibibox)\.(?:com|link)$/i.test(
        urlObj.hostname,
      ),
  },

  // --- Common Shortlinks / Gateways ---
  {
    name: "shortlink",
    platform: "resolver",
    defaultMethod: "unshorten",
    methods: ["unshorten"],
    type: "shortlink",
    match: (urlObj) => COMMON_SHORTENERS.has(urlObj.hostname.toLowerCase()),
  },
];

/**
 * Detect platform and available scraper methods for a given URL.
 *
 * @param {string} rawUrl - Target URL
 * @returns {Object} Detection result
 */
function detect(rawUrl) {
  const url = cleanUrl(rawUrl);
  if (!url) {
    return {
      status: false,
      platform: null,
      method: null,
      methods: [],
      fallbackMethods: [],
      type: "invalid",
      url: rawUrl || "",
      error: "Invalid or empty URL provided.",
    };
  }

  let urlObj;
  try {
    urlObj = new URL(url);
  } catch (err) {
    return {
      status: false,
      platform: null,
      method: null,
      methods: [],
      fallbackMethods: [],
      type: "invalid",
      url,
      error: `Could not parse URL: ${err.message}`,
    };
  }

  for (const rule of PLATFORM_RULES) {
    if (rule.match(urlObj)) {
      const defaultMethod =
        typeof rule.defaultMethod === "function"
          ? rule.defaultMethod(urlObj)
          : rule.defaultMethod;
      const methods =
        typeof rule.methods === "function"
          ? rule.methods(urlObj)
          : [...rule.methods];
      const type =
        typeof rule.type === "function" ? rule.type(urlObj) : rule.type;
      const fallbackMethods = methods.filter((m) => m !== defaultMethod);

      return {
        status: true,
        name: rule.name,
        platform: rule.platform,
        method: defaultMethod,
        methods,
        fallbackMethods,
        type,
        url,
      };
    }
  }

  return {
    status: false,
    platform: null,
    method: null,
    methods: [],
    fallbackMethods: [],
    type: "unknown",
    url,
    error: `Unsupported platform or domain: ${urlObj.hostname}`,
  };
}

/**
 * Returns a list of all supported platforms and their metadata.
 */
function getPlatforms() {
  return PLATFORM_RULES.map((rule) => ({
    name: rule.name,
    platform: rule.platform,
    methods: typeof rule.methods === "function" ? rule.methods(new URL("https://example.com")) : rule.methods,
    type: typeof rule.type === "function" ? "dynamic" : rule.type,
  }));
}

module.exports = {
  cleanUrl,
  detect,
  getPlatforms,
  COMMON_SHORTENERS,
  PLATFORM_RULES,
};
