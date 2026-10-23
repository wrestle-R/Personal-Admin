import { authenticated, sameOrigin, privateJson, sign } from "@/lib/auth";
import { limit } from "@/lib/limit";
import { query } from "@/lib/db";
export const maxDuration = 300;
export async function POST(request: Request) {
  if (!authenticated(request))
    return privateJson({ error: "Sign in required" }, 401);
  if (!sameOrigin(request))
    return privateJson({ error: "Invalid origin" }, 403);
  try {
    if (!(await limit(sign("strava-sync"), 1, 60)))
      return privateJson(
        { error: "Please wait a minute before syncing again." },
        429,
      );
    const origin = "https://runny.russel.is-a.dev";
    if (!process.env.RUNNY_REFRESH_PASSWORD)
      return privateJson(
        { error: "Runny refresh password is not configured." },
        503,
      );
    const login = await fetch(origin + "/api/refresh/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ password: process.env.RUNNY_REFRESH_PASSWORD }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!login.ok) throw new Error("Runny authentication failed");
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    if (!cookie) throw new Error("Missing Runny session");
    const response = await fetch(origin + "/api/sync", {
      method: "POST",
      headers: { Cookie: cookie, Origin: origin },
      signal: AbortSignal.timeout(240000),
      cache: "no-store",
    });
    const result = await response.json();
    await query(
      `INSERT INTO personal_admin.operations(kind,result) VALUES('strava_sync',$1)`,
      [JSON.stringify({ status: response.status, ...result })],
    );
    return privateJson(result, response.status);
  } catch {
    return privateJson(
      {
        error:
          "Runny sync failed. Check the Runny service and credentials, then retry.",
      },
      502,
    );
  }
}
