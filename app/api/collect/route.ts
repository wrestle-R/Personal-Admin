import { randomUUID } from "node:crypto";
import { siteForOrigin, normalizePath, classify, isBot } from "@/lib/sites";
import { sign } from "@/lib/auth";
import { query } from "@/lib/db";
import { limit } from "@/lib/limit";
import { readJsonObject, RequestBodyError } from "@/lib/request-json";
import { requestIp } from "@/lib/request-ip";
export const dynamic = "force-dynamic";
function cors(request: Request) {
  return {
    "Access-Control-Allow-Origin": request.headers.get("origin") || "null",
    Vary: "Origin",
    "Cache-Control": "no-store",
  };
}
export function OPTIONS(request: Request) {
  if (!siteForOrigin(request.headers.get("origin")))
    return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      ...cors(request),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
export async function POST(request: Request) {
  const site = siteForOrigin(request.headers.get("origin"));
  if (!site) return new Response(null, { status: 403 });
  const ua = request.headers.get("user-agent") || "";
  if (isBot(ua))
    return new Response(null, { status: 204, headers: cors(request) });
  try {
    const body = await readJsonObject(request, 2048);
    const path = normalizePath(body.path);
    if (
      typeof body.session !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        body.session,
      )
    )
      return new Response(null, { status: 400 });
    const visitKey = sign("visit:" + site.id + ":" + body.session);
    const kinds = new Set<unknown>(["pageview", "resume_pdf", "resume_image", "resume_open"]);
    if (
      !path ||
      !kinds.has(body.kind) ||
      (body.kind !== "pageview" &&
        (site.id !== "portfolio" || path !== "/resume"))
    )
      return new Response(null, { status: 400 });
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const ip = requestIp(request);
    const visitor = sign(`${day}:${site.id}:${ip}:${ua}`);
    if (!(await limit(sign(`event:${site.id}:${ip}`), 120, 60)))
      return new Response(null, { status: 429, headers: cors(request) });
    let referrer = "Direct";
    try {
      const ref = new URL(typeof body.referrer === "string" ? body.referrer : "");
      if (ref.origin !== request.headers.get("origin"))
        referrer = ref.hostname.slice(0, 200);
    } catch {}
    const { device, browser, os } = classify(ua);
    const id =
      typeof body.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id)
        ? body.id
        : randomUUID();
    await query(
      `INSERT INTO personal_admin.events(id,site,path,kind,visit_key,visitor,device,browser,os,referrer) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
      [
        id,
        site.id,
        path,
        body.kind,
        visitKey,
        visitor,
        device,
        browser,
        os,
        referrer,
      ],
    );
    return new Response(null, { status: 204, headers: cors(request) });
  } catch (error) {
    return new Response(null, {
      status: error instanceof RequestBodyError ? error.status : 503,
      headers: cors(request),
    });
  }
}
