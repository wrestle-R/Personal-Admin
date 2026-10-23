import type { NextConfig } from "next";
const config: NextConfig = { async headers() { return [{ source: "/:path*", headers: [{key:"X-Robots-Tag",value:"noindex, nofollow"},{key:"X-Content-Type-Options",value:"nosniff"},{key:"Referrer-Policy",value:"same-origin"},{key:"X-Frame-Options",value:"DENY"}] }]; } };
export default config;
