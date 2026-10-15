"use strict";

const { detect, extract, resolve, getPlatforms } = require("./lib/core");

const bilibili = require("./lib/bilibili");
const douyin = require("./lib/douyin");
const applemusic = require("./lib/applemusic");
const soundcloud = require("./lib/soundcloud");
const tiktok = require("./lib/tiktok");
const youtube = require("./lib/youtube");
const instagram = require("./lib/instagram");
const bandcamp = require("./lib/bandcamp");
const spotify = require("./lib/spotify");
const twitter = require("./lib/twitter");
const pinterest = require("./lib/pinterest");
const facebook = require("./lib/facebook");
const threads = require("./lib/threads");
const pixiv = require("./lib/pixiv");
const rednote = require("./lib/rednote");
const reddit = require("./lib/reddit");
const terabox = require("./lib/terabox");
const resolver = require("./lib/resolver");

/**
 * Universal media extractor and link resolver.
 * Calling `scrapr(url, options)` is equivalent to `scrapr.extract(url, options)`.
 *
 * @param {string} url - Target URL to extract or resolve
 * @param {Object} [options] - Options
 * @returns {Promise<Object>} Unified response object
 */
function scrapr(url, options) {
  return extract(url, options);
}

Object.assign(scrapr, {
  // Core Auto-detection and Orchestration API
  extract,
  resolve,
  detect,
  getPlatforms,

  // Direct Platform Namespaces
  bilibili,
  douyin,
  applemusic,
  soundcloud,
  tiktok,
  youtube,
  instagram,
  bandcamp,
  spotify,
  twitter,
  pinterest,
  facebook,
  threads,
  pixiv,
  rednote,
  reddit,
  terabox,
  resolver,
});

// ESM / TypeScript default interop
scrapr.default = scrapr;

module.exports = scrapr;
