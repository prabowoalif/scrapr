"use strict";

const assert = require("assert");
const scrapr = require("../index");

async function runTests() {
  console.log("=== Running scrapr Core & Auto-Detector Tests ===\n");
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Detection tests
  test("Detect: TikTok standard URL", () => {
    const d = scrapr.detect("https://www.tiktok.com/@user/video/7641620679846153492");
    assert.strictEqual(d.status, true);
    assert.strictEqual(d.platform, "tiktok");
    assert.strictEqual(d.method, "snaptik");
    assert.ok(d.fallbackMethods.includes("tiktokio"));
  });

  test("Detect: TikTok short link (vt.tiktok.com)", () => {
    const d = scrapr.detect("https://vt.tiktok.com/ZSxxxx/");
    assert.strictEqual(d.status, true);
    assert.strictEqual(d.platform, "tiktok");
  });

  test("Detect: Instagram reel", () => {
    const d = scrapr.detect("https://www.instagram.com/reel/CvsLZsqOzt7/");
    assert.strictEqual(d.status, true);
    assert.strictEqual(d.platform, "instagram");
    assert.strictEqual(d.method, "direct");
  });

  test("Detect: Twitter / X", () => {
    const d = scrapr.detect("https://x.com/Interior/status/463440424141459456");
    assert.strictEqual(d.status, true);
    assert.strictEqual(d.platform, "twitter");
    assert.strictEqual(d.method, "direct");
  });

  test("Detect: YouTube single video", () => {
    const d = scrapr.detect("https://youtu.be/RxiTWxP9Xf4");
    assert.strictEqual(d.status, true);
    assert.strictEqual(d.platform, "youtube");
    assert.strictEqual(d.method, "ytmp3");
  });

  test("Detect: YouTube playlist", () => {
    const d = scrapr.detect("https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI");
    assert.strictEqual(d.status, true);
    assert.strictEqual(d.platform, "youtube");
    assert.strictEqual(d.method, "playlist");
  });

  test("Detect: Spotify track", () => {
    const d = scrapr.detect("https://open.spotify.com/track/2FZIabCRMEWAYfN69Ijn1U");
    assert.strictEqual(d.status, true);
    assert.strictEqual(d.platform, "spotify");
  });

  test("Detect: MediaFire resolver", () => {
    const d = scrapr.detect("https://www.mediafire.com/file/w4b1fjoijyug9qz/nix.py");
    assert.strictEqual(d.status, true);
    assert.strictEqual(d.platform, "resolver");
    assert.strictEqual(d.method, "mediafire");
  });

  test("Detect: Sfile resolver", () => {
    const d = scrapr.detect("https://sfile.co/IfoNMF2mJlI");
    assert.strictEqual(d.status, true);
    assert.strictEqual(d.platform, "resolver");
    assert.strictEqual(d.method, "sfile");
  });

  test("Detect: Shortlink (bit.ly)", () => {
    const d = scrapr.detect("https://bit.ly/3xyz");
    assert.strictEqual(d.status, true);
    assert.strictEqual(d.platform, "resolver");
    assert.strictEqual(d.method, "unshorten");
  });

  test("Detect: Invalid or empty URL", () => {
    const d1 = scrapr.detect("");
    assert.strictEqual(d1.status, false);
    const d2 = scrapr.detect("not a url at all");
    assert.strictEqual(d2.status, false);
  });

  test("API: scrapr is callable and has attached platform namespaces", () => {
    assert.strictEqual(typeof scrapr, "function");
    assert.strictEqual(typeof scrapr.extract, "function");
    assert.strictEqual(typeof scrapr.resolve, "function");
    assert.strictEqual(typeof scrapr.detect, "function");
    assert.strictEqual(typeof scrapr.getPlatforms, "function");
    assert.strictEqual(typeof scrapr.tiktok.snaptik, "function");
    assert.strictEqual(typeof scrapr.resolver.mediafire, "function");
  });

  test("API: getPlatforms lists all platforms", () => {
    const platforms = scrapr.getPlatforms();
    assert.ok(Array.isArray(platforms));
    assert.ok(platforms.length >= 18);
    const tiktokEntry = platforms.find((p) => p.name === "tiktok");
    assert.ok(tiktokEntry);
    assert.ok(tiktokEntry.methods.includes("snaptik"));
  });

  // 2. Execution & Fallback tests
  await testAsync("Execution: scrapr(url) callable matches extract()", async () => {
    const res = await scrapr("https://pixeldrain.com/d/8xz8hcYJ");
    assert.strictEqual(res.status, true);
    assert.strictEqual(res.platform, "resolver");
    assert.strictEqual(res.method, "pixeldrain");
    assert.ok(res.result.url);
  });

  await testAsync("Execution: fallback engine catches failed method and tries next", async () => {
    let attempted = [];
    const res = await scrapr.extract("https://pixeldrain.com/d/8xz8hcYJ", {
      platform: "resolver",
      methods: ["fake_method", "pixeldrain"],
      onAttempt: (att) => attempted.push(att.method),
    });

    assert.strictEqual(res.status, true);
    assert.strictEqual(res.method, "pixeldrain");
    assert.strictEqual(res.attemptsCount, 2);
    assert.deepStrictEqual(attempted, ["pixeldrain"]); // fake_method is skipped before attempt callback if not a fn
  });

  await testAsync("Execution: captures error summary when all methods fail", async () => {
    const res = await scrapr.extract("https://pixeldrain.com/d/8xz8hcYJ", {
      platform: "resolver",
      methods: ["non_existent_1", "non_existent_2"],
    });

    assert.strictEqual(res.status, false);
    assert.ok(res.message.includes("All scrapers failed"));
    assert.strictEqual(res.errors.length, 2);
  });

  console.log(`\nTests finished: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

runTests();
