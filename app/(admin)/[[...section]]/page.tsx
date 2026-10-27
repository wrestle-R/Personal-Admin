import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  Command,
  Database,
  Globe,
  Headphones,
  LayoutDashboard,
  Monitor,
  MoveUpRight,
  Footprints,
} from "lucide-react";
import { COOKIE, validSession } from "@/lib/auth";
import { dashboardData, databaseStatus, type Row } from "@/lib/data";
import { sites } from "@/lib/sites";
import RunnyPhotos from "@/components/RunnyPhotos";
import OverviewGraphs from "@/components/OverviewGraphs";
import { Logout } from "@/components/Controls";
export const dynamic = "force-dynamic";
const fmt = (n: unknown) => Number(n || 0).toLocaleString("en-IN");
const date = (s: unknown) =>
  s
    ? new Date(String(s)).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No data yet";
const icons = {
  blogs: BookOpen,
  portfolio: Monitor,
  spotify: Headphones,
  runny: Footprints,
};
function Breakdown({ title, rows }: { title: string; rows: Row[] }) {
  const sum = rows.reduce((n, r) => n + Number(r.count), 0);
  return (
    <section className="breakdown">
      <h3>{title}</h3>
      {rows.length ? (
        rows.map((row) => (
          <div className="breakdown-row" key={String(row.name)}>
            <div>
              <span>{row.name}</span>
              <span className="number">
                {fmt(row.count)}{" "}
                <small>{Math.round((Number(row.count) / sum) * 100)}%</small>
              </span>
            </div>
            <div className="track">
              <span style={{ width: `${(Number(row.count) / sum) * 100}%` }} />
            </div>
          </div>
        ))
      ) : (
        <p className="empty-small">Waiting for the first visit.</p>
      )}
    </section>
  );
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ days?: string; path?: string }>;
}) {
  if (!validSession((await cookies()).get(COOKIE)?.value)) redirect("/login");
  const { section = [] } = await params,
    search = await searchParams;
  const current = section[0] || "overview",
    site = sites.find((s) => s.id === current);
  if (
    section.length > 1 ||
    (!site && !["overview", "database", "resume"].includes(current))
  )
    notFound();
  const selectedSite = current === "resume" ? "portfolio" : site?.id;
  const path =
    current === "resume" ? "/resume" : site ? search.path : undefined;
  const days = [7, 30, 90].includes(Number(search.days))
    ? Number(search.days)
    : 30;
  const [{ data, pages, errors }, health] = await Promise.all([
    dashboardData(selectedSite, path, days),
    databaseStatus(),
  ]);
  const totals = data.totals[0] || {};
  const title =
    current === "overview"
      ? "Overview"
      : current === "database"
        ? "Database"
        : current === "resume"
          ? "Resume"
          : path
            ? pages[0]?.title || path
            : site?.name || "";
  const selectedHref = current === "overview" ? "/" : `/${current}`;
  const query = (d: number) =>
    `${selectedHref}?days=${d}${path && current !== "resume" ? "&path=" + encodeURIComponent(path) : ""}`;
  const daily = new Map(data.daily.map((r) => [r.day, Number(r.views)]));
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    return { key, value: daily.get(key) || 0 };
  });
  const max = Math.max(...dates.map((d) => d.value), 1);
  return (
    <div className="app-shell">
      <a href="#content" className="skip">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Command size={19} />
          </span>
          personal<span className="muted">/ admin</span>
        </Link>
        <nav aria-label="Main">
          <Link href="/" className={current === "overview" ? "active" : ""} aria-current={current === "overview" ? "page" : undefined}>
            <LayoutDashboard size={17} />
            Overview
          </Link>
          {sites.map((s) => {
            const Icon = icons[s.id];
            return (
              <Link
                key={s.id}
                href={`/${s.id}`}
                className={current === s.id ? "active" : ""}
                aria-current={current === s.id ? "page" : undefined}
              >
                <Icon size={17} />
                {s.name}
              </Link>
            );
          })}
          <div className="nav-divider" />
          <Link href="/resume" className={current === "resume" ? "active" : ""} aria-current={current === "resume" ? "page" : undefined}>
            <ArrowDownToLine size={17} />
            Resume
          </Link>

          <Link
            href="/database"
            className={current === "database" ? "active" : ""}
            aria-current={current === "database" ? "page" : undefined}
          >
            <Database size={17} />
            Database
            <span className={`status-dot ${health.ok ? "" : "bad"}`} />
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className={`status-dot ${health.ok ? "" : "bad"}`} />
            {health.ok ? "Database connected" : "Database needs attention"}

          </div>
          <Logout />
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span>{" "}
            {current === "overview"
              ? "Overview"
              : current === "resume"
                ? "Resume"
                : site?.name || "Database"}
          </span>
          <div className="topbar-right">
            <span className="private-badge">
              <span /> Private workspace
            </span>
            <div className="mobile-logout">
              <Logout />
            </div>
          </div>
        </header>
        <main
          id="content"
          className={`content ${current === "overview" ? "overview-content" : ""}`}
        >
          <div className="page-heading">
            <div>
              {path && current !== "resume" && (
                <Link className="back" href={`/${current}?days=${days}`}>
                  <ArrowLeft size={13} />
                  All pages
                </Link>
              )}
              <h1>{title}</h1>
              <p className="muted">
                {current === "overview"
                  ? "Traffic across your websites."
                  : current === "database"
                    ? "Connection health and records in your shared database."
                    : current === "resume"
                      ? "Page visits, PDF downloads and image downloads."
                      : path
                        ? path
                        : site?.description}
              </p>
            </div>
            <div className="heading-actions">
              {site && (
                <a
                  className="external"
                  href={site.url + (path || "")}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visit site
                  <ArrowUpRight size={14} />
                </a>
              )}
              {current !== "database" && (
                <nav className="tabs" aria-label="Date range">
                  {[7, 30, 90].map((d) => (
                    <Link
                      key={d}
                      href={query(d)}
                      className={d === days ? "selected" : ""}
                      aria-current={d === days ? "page" : undefined}
                    >
                      {d} days
                    </Link>
                  ))}
                </nav>
              )}
            </div>
          </div>
          {errors.length > 0 && (
            <div className="notice error" role="status">
              Some data couldn't load ({errors.join(", ")}). Check Database and
              try again.
            </div>
          )}
          {current !== "database" && (
            <>
              <div className="stats-grid">
                <section>
                  <span>
                    Page views
                    <MoveUpRight size={14} />
                  </span>
                  <strong>{fmt(totals.views)}</strong>
                  <small>Reloads excluded.</small>
                </section>
                <section>
                  <span>
                    Daily visitors
                    <Globe size={14} />
                  </span>
                  <strong>{fmt(totals.visitors)}</strong>
                  <small>Daily visitor estimates.</small>
                </section>
                <section>
                  <span>
                    {current === "resume"
                      ? "Resume actions"
                      : "Pages with visits"}
                    <BookOpen size={14} />
                  </span>
                  <strong>
                    {current === "resume"
                      ? fmt(totals.downloads)
                      : fmt(pages.filter((p) => Number(p.views) > 0).length)}
                  </strong>
                  <small>
                    {current === "resume"
                      ? "Downloads and open-file clicks."
                      : "In this date range."}
                  </small>
                </section>
                <section>
                  <span>
                    Database
                    <Database size={14} />
                  </span>
                  <strong className="health-value">
                    <span className={`status-dot ${health.ok ? "" : "bad"}`} />
                    {health.ok ? "Connected" : "Unavailable"}
                  </strong>
                  <small>
                    {health.ok
                      ? `${health.latency} ms · live query check`
                      : "Connection needs attention"}
                  </small>
                </section>
              </div>
              {current !== "overview" && (
                <>
                  <section className="panel traffic">
                    <div className="panel-heading">
                      <div>
                        <h2>Traffic</h2>
                        <p>Page views over the last {days} days</p>
                      </div>
                      <span className="legend">
                        <i />
                        Page views
                      </span>
                    </div>
                    <div
                      className="chart"
                      role="img"
                      aria-label={`Daily page views: ${dates.map((d) => d.key + ": " + d.value).join(", ")}`}
                    >
                      <div className="chart-grid">
                        <span>{fmt(max)}</span>
                        <span>{fmt(Math.round(max / 2))}</span>
                        <span>0</span>
                      </div>
                      <div className="bars">
                        {dates.map((d) => (
                          <div key={d.key} title={`${d.key}: ${d.value} views`}>
                            <span
                              style={{
                                height: d.value
                                  ? `${Math.max((d.value / max) * 100, 2)}%`
                                  : "2px",
                              }}
                              className={d.value ? "" : "zero"}
                            />
                          </div>
                        ))}
                      </div>
                      {!Number(totals.views) && (
                        <div className="chart-empty">
                          <Activity size={20} />
                          <strong>No visits yet.</strong>
                          <span>
                            Visits will appear here as they happen.
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="chart-axis">
                      <span>{dates[0].key}</span>
                      <span>{dates.at(-1)?.key}</span>
                    </div>
                  </section>
                </>
              )}
              {current === "overview" && (
                <OverviewGraphs
                  days={dates.map((d) => ({
                    date: d.key,
                    views: d.value,
                    visitors: Number(
                      data.daily.find((row) => row.day === d.key)?.visitors ||
                        0,
                    ),
                  }))}
                  devices={data.device.map((r) => ({
                    name: String(r.name),
                    count: Number(r.count),
                  }))}
                  browsers={data.browser.map((r) => ({
                    name: String(r.name),
                    count: Number(r.count),
                  }))}
                  websites={sites.map((site) => ({
                    id: site.id,
                    name: site.name,
                    views: pages
                      .filter((p) => p.site === site.id)
                      .reduce((n, p) => n + Number(p.views), 0),
                  }))}
                  range={days}
                />
              )}
              {current === "runny" && (
                <>
                  <RunnyPhotos />
                  <section className="panel export-panel">
                    <h2>Your running data.</h2>
                    <p className="muted">
                      Download your saved activities, including any recorded splits.
                    </p>
                    <div className="actions">
                      <a className="primary" href="/api/export">
                        <ArrowDownToLine size={15} /> Export CSV + splits
                      </a>
                    </div>
                  </section>
                </>
              )}
              {current !== "overview" && (
                <>
                  <section className="panel pages-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          {path
                            ? "This page"
                            : current === "blogs"
                              ? "Posts & pages"
                              : "Pages"}
                        </h2>
                        <p>
                          Select a page to see its traffic sources and devices.
                        </p>
                      </div>
                      <span className="tiny">
                        {pages.length} {pages.length === 1 ? "page" : "pages"}
                      </span>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Page</th>
                            {!site && current !== "resume" && <th>Website</th>}
                            <th className="numeric">Views</th>
                            <th className="numeric">Daily visitors</th>
                            {(current === "blogs" ||
                              current === "overview") && (
                              <th className="numeric">Old counter*</th>
                            )}
                            <th>
                              <span className="sr-only">Details</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pages.map((p) => (
                            <tr key={p.site + p.path}>
                              <td>
                                <Link
                                  href={`/${p.site}?days=${days}&path=${encodeURIComponent(p.path)}`}
                                >
                                  <strong>{p.title}</strong>
                                  <small>
                                    {p.path}{" "}
                                    {p.type === "Post" && (
                                      <span className="post-tag">POST</span>
                                    )}
                                  </small>
                                </Link>
                              </td>
                              {!site && current !== "resume" && (
                                <td className="muted">
                                  {sites.find((s) => s.id === p.site)?.name}
                                </td>
                              )}
                              <td className="numeric">{fmt(p.views)}</td>
                              <td className="numeric muted">
                                {fmt(p.visitors)}
                              </td>
                              {(current === "blogs" ||
                                current === "overview") && (
                                <td className="numeric muted">
                                  {p.legacy === null ? "—" : fmt(p.legacy)}
                                </td>
                              )}
                              <td>
                                <Link
                                  aria-label={`View ${p.title} analytics`}
                                  href={`/${p.site}?days=${days}&path=${encodeURIComponent(p.path)}`}
                                >
                                  <ArrowUpRight size={15} />
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {(current === "blogs" || current === "overview") && (
                      <p className="table-note">
                        * Old blog counters are lifetime totals and may include
                        refreshes. They are kept separate from new views.
                      </p>
                    )}
                  </section>
                  <div className="breakdowns">
                    <Breakdown title="Devices" rows={data.device} />
                    <Breakdown title="Browsers" rows={data.browser} />
                    <Breakdown title="Operating systems" rows={data.os} />
                    <Breakdown title="Referrers" rows={data.referrer} />
                    {current === "resume" && (
                      <Breakdown title="Resume actions" rows={data.kind} />
                    )}
                  </div>
                </>
              )}
              <div className="method-note">
                <Check size={15} />
                <p>
                  {current === "overview"
                    ? "One view per page per visit. Refreshes excluded. Production sites only."
                    : "Each page counts once per visit. Visits reset after 30 minutes of inactivity. Known bots, DNT and GPC are excluded. Desktop and laptop are grouped. Daily visitors are anonymous estimates. No raw IPs or URL queries are stored."}
                </p>
              </div>
            </>
          )}
          {current === "database" && (
            <>
              <section className="panel db-hero">
                <span className={`status-dot ${health.ok ? "" : "bad"}`} />
                <div>
                  <h2>
                    {health.ok
                      ? "Database connected"
                      : "Connection needs attention"}
                  </h2>
                  <p className="muted">
                    {health.ok
                      ? `PostgreSQL / Supabase · ${health.latency} ms round trip`
                      : health.error}
                  </p>
                </div>
                <span className="db-label">LIVE QUERY</span>
              </section>
              <div className="db-grid">
                {health.counts.map((row) => (
                  <section key={row.name}>
                    <span>{row.name}</span>
                    <strong>{fmt(row.count)}</strong>
                    <small>rows stored</small>
                  </section>
                ))}
              </div>
              <section className="panel db-details">
                <h2>Connection notes</h2>
                <dl>
                  <div>
                    <dt>Database size</dt>
                    <dd>
                      {health.info
                        ? `${(Number(health.info.bytes) / 1024 / 1024).toFixed(1)} MB`
                        : "Unavailable"}
                    </dd>
                  </div>
                  <div>
                    <dt>Latest run record update</dt>
                    <dd>{date(health.lastSync)}</dd>
                  </div>
                  <div>
                    <dt>Last check</dt>
                    <dd>{date(health.info?.checked)}</dd>
                  </div>
                  <div>
                    <dt>Analytics storage</dt>
                    <dd>Private schema · server access only</dd>
                  </div>
                </dl>
                <p className="tiny">
                  A successful query confirms connectivity. It doesn't verify
                  backups, storage quotas or every database in other services.
                </p>
              </section>
            </>
          )}
          <footer className="content-footer">
            <span>personal / admin</span>
            <span>Times shown in IST</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
