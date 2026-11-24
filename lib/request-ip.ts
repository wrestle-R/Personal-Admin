import { isIP } from "node:net";

export function requestIp(request: Request) {
  const forwarded = process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.trim()
    : undefined;
  return forwarded && isIP(forwarded) ? forwarded : "unknown";
}
