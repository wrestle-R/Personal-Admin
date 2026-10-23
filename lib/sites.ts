export const sites = [
 {id:"blogs",name:"Blogs",host:"blogs.russel.is-a.dev",url:"https://blogs.russel.is-a.dev",description:"Posts, movies, music and all the little pages."},
 {id:"portfolio",name:"Portfolio",host:"russeldanielpaul.is-a.dev",url:"https://russeldanielpaul.is-a.dev",description:"The portfolio, resume and project links."},
 {id:"spotify",name:"Spotify",host:"spotify.russel.is-a.dev",url:"https://spotify.russel.is-a.dev",description:"Constellation and the 2D portrait."},
 {id:"runny",name:"Runny",host:"runny.russel.is-a.dev",url:"https://runny.russel.is-a.dev",description:"Running Out of Excuses. Runs, sync and exports."},
] as const;
export function siteForOrigin(origin: string | null) {
  if (!origin) return undefined;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return undefined;
    const aliases: Record<string,string[]> = {
      blogs:["blogs.russel.is-a.dev","blogs.russeldanielpaul.is-a.dev","blogs-rdp.vercel.app"],
      portfolio:["russel.is-a.dev","russeldanielpaul.is-a.dev","www.russel.is-a.dev","www.russeldanielpaul.is-a.dev","portfolio-rdp.vercel.app"],
      spotify:["spotify.russel.is-a.dev","spotify.russeldanielpaul.is-a.dev","russels-constellation.vercel.app"],
      runny:["runny.russel.is-a.dev","runny.russeldanielpaul.is-a.dev","running-out-of-excuses.vercel.app"],
    };
    return sites.find(s=>aliases[s.id].includes(url.hostname));
  } catch { return undefined; }
}
export function normalizePath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.length > 500) return null;
  const path = value.split(/[?#]/)[0].replace(/\/{2,}/g,"/").replace(/\/$/,"") || "/";
  return path.startsWith("/api/") || path === "/refresh" ? null : path;
}
export function classify(ua: string) {
  const device = /ipad|tablet|android(?!.*mobile)/i.test(ua) ? "Tablet" : /mobile|iphone|ipod/i.test(ua) ? "Mobile" : "Desktop / laptop";
  const browser = /edg/i.test(ua) ? "Edge" : /opr|opera/i.test(ua) ? "Opera" : /firefox|fxios/i.test(ua) ? "Firefox" : /chrome|crios/i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari" : "Other";
  const os = /windows/i.test(ua)?"Windows":/android/i.test(ua)?"Android":/iphone|ipad/i.test(ua)?"iOS":/macintosh/i.test(ua)?"macOS":/linux/i.test(ua)?"Linux":"Other";
  return {device,browser,os};
}
export const isBot = (ua: string) => !ua || /bot|crawler|spider|headless|lighthouse|preview|curl|wget|python|monitor/i.test(ua);
