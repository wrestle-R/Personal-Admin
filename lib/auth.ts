import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
export const COOKIE = "personal_admin";
export const TTL = 8 * 60 * 60;
export function sign(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Session secret missing");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function passwordMatches(input: unknown) {
  if (typeof input !== "string" || input.length > 256) return false;
  const [salt, expected] = (process.env.ADMIN_PASSWORD_HASH || "").split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(input, salt, 64), stored = Buffer.from(expected, "hex");
  return stored.length === actual.length && timingSafeEqual(stored, actual);
}
export function createSession(now = Date.now()) {
  const value = `${now + TTL * 1000}.${randomBytes(16).toString("hex")}`;
  return `${value}.${sign(value)}`;
}
export function validSession(token: string | undefined, now = Date.now()) {
  if (!token || token.length > 256 || !process.env.SESSION_SECRET) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^[0-9a-f]{32}$/.test(parts[1]) || !/^[0-9a-f]{64}$/.test(parts[2])) return false;
  const expiry = Number(parts[0]);
  if (!Number.isFinite(expiry) || expiry <= now || expiry > now + TTL * 1000) return false;
  const expected = Buffer.from(sign(parts.slice(0,2).join(".")), "hex"), actual = Buffer.from(parts[2], "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function authenticated(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="))?.slice(COOKIE.length+1);
  return validSession(token);
}
export function sameOrigin(request: Request) {
  return request.headers.get("sec-fetch-site") !== "cross-site" && request.headers.get("origin") === new URL(request.url).origin;
}
export function privateJson(value: unknown, status = 200) { return Response.json(value, {status, headers:{"Cache-Control":"no-store"}}); }
