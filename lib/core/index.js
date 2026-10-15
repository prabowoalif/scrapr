"use strict";

const { detect, getPlatforms, cleanUrl, PLATFORM_RULES } = require("./detector");
const { extract, resolve } = require("./extract");

module.exports = {
  detect,
  extract,
  resolve,
  getPlatforms,
  cleanUrl,
  PLATFORM_RULES,
};
