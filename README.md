# Personal-Admin

A small, password-protected dashboard for my Blogs, Portfolio, Spotify constellation and Runny.

- Sidebar dashboard, individual post and route analytics, 7/30/90-day ranges.
- Once-per-page-per-visit views, devices, browsers, operating systems and referrer domains.
- Portfolio resume visits and download/open actions.
- Shared PostgreSQL connection checks, record counts and size.
- Existing Runny Strava sync and CSV export with splits. Runny `/refresh` redirects here.

## Local setup

Use Node 22+ and `npm ci`. Copy `.env.example` to `.env.local`, configure the server-only values, and apply `db/setup.sql` to the existing Runny PostgreSQL database. Run `npm run dev` (port 3410), `npm run typecheck`, `npm test` and `npm run build`.

The configured password is stored as a salted scrypt hash, never in source. Create a random session signing secret. Authentication is checked on every dashboard request and privileged API; signed sessions expire after eight hours. Database-backed login and collection limits work across instances.

Deploy to Vercel project `admin-rdp`. Production and preview require the four variables in `.env.example`. The public GitHub repository contains source only, not credentials or private local notes.

## Measurement

`/tracker.js` is loaded by each website. It honors Do Not Track and Global Privacy Control, excludes known bots and hides refresh/API routes. It observes normal page loads, History API navigation and Astro navigation. Local storage keeps a visit ID across tabs and reloads; after 30 minutes without observed activity, the next activity creates a new visit. A database unique index enforces one pageview per site/path/visit, including concurrent reloads. If storage is blocked, persistence across reloads is unavailable. This is an estimate, not proof that every visitor is human. Public collectors cannot be made tamper-proof.

Device/browser/OS are inferred from user-agent, and laptops/desktops are grouped. Daily visitor estimates are salted hashes of site, UTC date, IP and user-agent, so totals sum daily estimates across sites. Raw IPs, user-agent strings and URL queries are not stored. Referrers store domains only. Historical blog counters are displayed separately; device/browser history cannot be recovered from those totals.

Resume actions measure clicks, not confirmed file transfers. Website coverage lists known source routes, and newly visited dynamic paths appear automatically. The static route catalogue is `lib/catalogue.json`; update it when adding posts if you want them listed before their first visit.

Database status describes the shared Runny/Supabase PostgreSQL connection only. It does not verify Firebase, backups, quotas or provider uptime. No subscriber email addresses are returned to the dashboard.

Analytics uses a private schema with public, anon and authenticated access revoked, plus row-level security. No existing application tables are changed. The server database connection is currently the existing Runny connection; a dedicated least-privilege database role is a future improvement.

No editing controls are included in this first version.
