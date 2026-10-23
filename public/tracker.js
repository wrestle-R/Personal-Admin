(() => {
 if (window.__personalAdminTracker || navigator.webdriver || navigator.doNotTrack === "1" || navigator.globalPrivacyControl) return;
 window.__personalAdminTracker = true;
 const endpoint = "https://admin-rdp.vercel.app/api/collect";
 let lastPath = "", lastAt = 0;
 let memorySession = {id:crypto.randomUUID(),last:Date.now()};
 function session() {
  let current=memorySession;
  try { current=JSON.parse(localStorage.getItem("personal_admin_visit")||"null")||current; } catch {}
  if(!current.id || Date.now()-current.last>30*60*1000)current={id:crypto.randomUUID(),last:Date.now()};
  current.last=Date.now();memorySession=current;
  try {localStorage.setItem("personal_admin_visit",JSON.stringify(current));}catch{}
  return current.id;
 }
 // Local storage persists across reloads and tabs. The server also enforces one page view per visit.
 let touched=0;
 for(const event of ["pointerdown","keydown","scroll"]) addEventListener(event,()=>{if(Date.now()-touched>60000){touched=Date.now();session();}},{passive:true});
 function send(kind = "pageview") {
  if (document.visibilityState !== "visible") return;
  const path = location.pathname.replace(/\/$/, "") || "/";
  if (path === "/refresh" || path.startsWith("/api/")) return;
  if (kind === "pageview" && path === lastPath && Date.now() - lastAt < 1500) return;
  if (kind === "pageview") { lastPath = path; lastAt = Date.now(); }
  const body = JSON.stringify({id:crypto.randomUUID(),session:session(),path,kind,referrer:document.referrer});
  fetch(endpoint,{method:"POST",body,headers:{"Content-Type":"text/plain"},keepalive:true,credentials:"omit"}).catch(()=>{});
 }
 const page = () => setTimeout(() => send(), 150);
 for (const method of ["pushState","replaceState"]) {
  const original=history[method];
  history[method]=function(...args){const before=location.pathname;const result=original.apply(this,args);if(location.pathname!==before)page();return result;};
 }
 addEventListener("popstate",page);
 document.addEventListener("astro:page-load",page);
 document.addEventListener("visibilitychange",()=>{if(!lastPath)page();});
 document.addEventListener("click",event=>{
  const node=event.target instanceof Element?event.target.closest("[data-admin-event],a[href*='/Resume/']"):null;
  if(!node || location.pathname.replace(/\/$/,"")!=="/resume")return;
  const explicit=node.getAttribute("data-admin-event");
  const kind=explicit || (node.getAttribute("download") ? (/\.pdf/i.test(node.getAttribute("href")||"")?"resume_pdf":"resume_image") : "resume_open");
  send(kind);
 },true);
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",page,{once:true});else page();
})();
