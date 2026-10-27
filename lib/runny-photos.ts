import { createHash, randomUUID } from "node:crypto";
import collections from "./runny-photo-collections.json";

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const FORMATS = "jpg,jpeg,png,webp,avif,gif";
export { collections };

export class PhotoError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function photoCollection(value: unknown) {
  const collection = collections.find((item) => item.value === value);
  if (!collection) throw new PhotoError("Choose a gallery or timeline period.");
  return collection;
}

export function photoText(body: Record<string, unknown>) {
  if (typeof body.alt !== "string" || !body.alt.trim() || body.alt.trim().length > 240)
    throw new PhotoError("Add a photo description, up to 240 characters.");
  if (typeof body.caption !== "string" || body.caption.length > 1000)
    throw new PhotoError("Keep the caption under 1,000 characters.");
  return { alt: body.alt.trim(), caption: body.caption.trim() };
}

export function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret)
    throw new PhotoError("Cloudinary uploads need to be configured on the server.", 503);
  if (cloudName !== "dvti0xrsg") throw new PhotoError("Cloudinary must use Runny’s existing account.", 503);
  return { cloudName, apiKey, apiSecret };
}

export function cloudinarySignature(params: Record<string, string | number>, secret: string) {
  const payload = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&");
  return createHash("sha1").update(payload + secret).digest("hex");
}

export function prepareUpload() {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const params = {
    allowed_formats: FORMATS,
    overwrite: "false",
    public_id: `runny/${randomUUID()}`,
    timestamp: Math.floor(Date.now() / 1000),
  };
  return { url: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, apiKey, params, signature: cloudinarySignature(params, apiSecret) };
}

// Never trust a URL or dimensions supplied by the browser. Retrieve the uploaded
// asset from the account before publishing its URL to the shared database.
export async function verifyUpload(publicId: unknown) {
  if (typeof publicId !== "string" || !/^runny\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(publicId))
    throw new PhotoError("Invalid upload. Please choose the photo again.");
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/${encodeURIComponent(publicId)}`, {
    headers: { Authorization: "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64") },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new PhotoError("Couldn’t verify the uploaded photo. Please retry.", 502);
  const asset = await response.json();
  const url = new URL(asset.secure_url);
  if (asset.public_id !== publicId || asset.resource_type !== "image" || asset.type !== "upload" ||
    !FORMATS.split(",").includes(asset.format) || !Number.isFinite(asset.bytes) || asset.bytes < 1 || asset.bytes > MAX_PHOTO_BYTES ||
    url.origin !== "https://res.cloudinary.com" || !url.pathname.startsWith(`/${cloudName}/image/upload/`))
    throw new PhotoError("Use a JPG, PNG, WebP, AVIF or GIF under 10 MB.");
  return { publicId, url: url.href };
}

export async function readPhotoBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new PhotoError("Missing photo details.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new PhotoError("Photo details are too large.", 413); }
    chunks.push(value);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new PhotoError("Invalid photo details."); }
}
