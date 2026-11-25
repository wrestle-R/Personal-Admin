import { isIP } from "node:net";

export function requestIp(request: Request) {
  if (process.env.VERCEL === "1") {
    for (const header of ["x-vercel-forwarded-for", "x-real-ip"]) {
      const ip = request.headers.get(header)?.trim();
      if (ip && isIP(ip)) return ip;
    }
  }
  // Keep requests without a trusted address bounded by the fallback throttle.
  return "unknown";
}
