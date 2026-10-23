import test from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import {
  createSession,
  validSession,
  passwordMatches,
  sameOrigin,
} from "../lib/auth";
import { siteForOrigin, normalizePath, classify, isBot } from "../lib/sites";
process.env.SESSION_SECRET = "test-only-secret-never-used-in-production";
test("signed sessions expire and reject tampering", () => {
  const now = Date.now(),
    token = createSession(now);
  assert.equal(validSession(token, now), true);
  assert.equal(validSession(token + "x", now), false);
  assert.equal(validSession(token, now + 9 * 3600000), false);
  assert.equal(validSession(undefined), false);
});
test("password hash accepts only matching input", () => {
  const salt = "test-only";
  process.env.ADMIN_PASSWORD_HASH =
    salt + ":" + scryptSync("test password", salt, 64).toString("hex");
  assert.equal(passwordMatches("test password"), true);
  assert.equal(passwordMatches("wrong"), false);
  assert.equal(passwordMatches({}), false);
});
test("mutations reject cross-origin requests", () => {
  assert.equal(
    sameOrigin(
      new Request("https://admin.test/api/auth", {
        headers: { origin: "https://evil.test" },
      }),
    ),
    false,
  );
  assert.equal(
    sameOrigin(
      new Request("https://admin.test/api/auth", {
        headers: { origin: "https://admin.test" },
      }),
    ),
    true,
  );
});
test("collection accepts only the owned origin allowlist", () => {
  assert.equal(siteForOrigin("https://blogs.russel.is-a.dev")?.id, "blogs");
  assert.equal(
    siteForOrigin("https://blogs.russel.is-a.dev.evil.test"),
    undefined,
  );
  assert.equal(siteForOrigin("https://evil.test"), undefined);
});
test("paths discard query values and protect internal routes", () => {
  assert.equal(normalizePath("/movies/?private=secret"), "/movies");
  assert.equal(normalizePath("//evil.test"), null);
  assert.equal(normalizePath("/refresh"), null);
  assert.equal(normalizePath("/api/test"), null);
});
test("classifies common browsers and excludes known bots", () => {
  assert.deepEqual(classify("Mozilla iPhone Mobile Safari"), {
    device: "Mobile",
    browser: "Safari",
    os: "iOS",
  });
  assert.equal(classify("Windows Chrome Edg/1").browser, "Edge");
  assert.equal(isBot("Googlebot"), true);
  assert.equal(isBot("Mozilla Chrome Safari"), false);
});
