import {
  COOKIE,
  TTL,
  createSession,
  passwordMatches,
  authenticated,
  sameOrigin,
  privateJson,
  sign,
} from "@/lib/auth";
import { limit } from "@/lib/limit";
import { readJsonObject, RequestBodyError } from "@/lib/request-json";
import { requestIp } from "@/lib/request-ip";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return privateJson({ error: "Invalid origin" }, 403);
  try {
    const key = sign("login:" + requestIp(request));
    if (!(await limit(key, 8, 900)))
      return privateJson(
        { error: "Too many attempts. Try again in 15 minutes." },
        429,
      );
    const body = await readJsonObject(request, 2048);
    if (!passwordMatches(body.password))
      return privateJson({ error: "That password isn't right." }, 401);
    const response = privateJson({ ok: true });
    response.headers.set(
      "Set-Cookie",
      `${COOKIE}=${createSession()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${TTL}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
    );
    return response;
  } catch (error) {
    if (error instanceof RequestBodyError)
      return privateJson({ error: "Invalid request" }, error.status);
    return privateJson(
      { error: "Unable to sign in. Check the server connection." },
      503,
    );
  }
}
export function GET(request: Request) {
  return privateJson({ authenticated: authenticated(request) });
}
export function DELETE(request: Request) {
  if (!sameOrigin(request))
    return privateJson({ error: "Invalid origin" }, 403);
  const response = privateJson({ ok: true });
  response.headers.set(
    "Set-Cookie",
    `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure`,
  );
  return response;
}
