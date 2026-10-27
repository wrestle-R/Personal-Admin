import test from "node:test";
import assert from "node:assert/strict";
import { photoCollection, photoText, readPhotoBody, prepareUpload, verifyUpload } from "../lib/runny-photos";
import { POST as upload } from "../app/api/runny/photos/upload/route";
import { GET, POST, PATCH } from "../app/api/runny/photos/route";
import { createSession } from "../lib/auth";

process.env.SESSION_SECRET = "photo-tests-only";
process.env.CLOUDINARY_CLOUD_NAME = "dvti0xrsg";
process.env.CLOUDINARY_API_KEY = "test-key";
process.env.CLOUDINARY_API_SECRET = "test-secret";

test("photo APIs require authentication and same-origin mutations", async () => {
  for (const handler of [GET, POST, PATCH, upload]) assert.equal((await handler(new Request("https://admin.test/api/runny/photos"))).status, 401);
  const cookie = `personal_admin=${createSession()}`;
  for (const handler of [POST, PATCH, upload]) assert.equal((await handler(new Request("https://admin.test/api/runny/photos", { method: "POST", headers: { cookie, origin: "https://evil.test" } }))).status, 403);
});

test("only existing gallery/timeline placements and bounded plain text are accepted", () => {
  assert.equal(photoCollection("timeline-2026-6").label, "June–October 2026");
  assert.throws(() => photoCollection("timeline-2026-7"));
  assert.throws(() => photoText({ alt: "", caption: "" }));
  assert.throws(() => photoText({ alt: "a", caption: "a".repeat(1001) }));
  assert.deepEqual(photoText({ alt: " Morning run ", caption: "  hello  " }), { alt: "Morning run", caption: "hello" });
});

test("signed upload cannot overwrite originals and never includes the secret", () => {
  const signed = prepareUpload();
  assert.equal(signed.params.overwrite, "false");
  assert.match(signed.params.public_id, /^runny\/[a-f0-9-]{36}$/);
  assert.match(signed.signature, /^[a-f0-9]{40}$/);
  assert.ok(!JSON.stringify(signed).includes("test-secret"));
  assert.notEqual(signed.params.public_id, prepareUpload().params.public_id);
});

test("request reader bounds actual bytes even without Content-Length", async () => {
  await assert.rejects(readPhotoBody(new Request("https://admin.test", { method: "POST", body: "a".repeat(8200) })), /too large/);
  await assert.rejects(readPhotoBody(new Request("https://admin.test", { method: "POST", body: "[]" })), /Invalid/);
});

test("published uploads are verified with Cloudinary, arbitrary IDs and oversized assets reject", async () => {
  await assert.rejects(verifyUpload("../../other-account"), /Invalid upload/);
  const publicId = "runny/12345678-1234-4234-8234-123456789abc";
  const asset = { public_id: publicId, resource_type: "image", type: "upload", format: "jpg", bytes: 1000, secure_url: `https://res.cloudinary.com/dvti0xrsg/image/upload/v1/${publicId}.jpg` };
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json(asset);
    assert.equal((await verifyUpload(publicId)).url, asset.secure_url);
    globalThis.fetch = async () => Response.json({ ...asset, bytes: 11 * 1024 * 1024 });
    await assert.rejects(verifyUpload(publicId), /under 10 MB/);
    globalThis.fetch = async () => Response.json({ ...asset, secure_url: "https://evil.test/photo.jpg" });
    await assert.rejects(verifyUpload(publicId), /under 10 MB/);
  } finally { globalThis.fetch = original; }
});
