import { query } from "./db";
import catalogue from "./catalogue.json";
export type Row = Record<string, string | number | null>;
export async function dashboardData(
  site: string | undefined,
  path: string | undefined,
  days: number,
) {
  const values = [days, site || null, path || null];
  const where = `created_at >= (((now() AT TIME ZONE 'Asia/Kolkata')::date - ($1::int - 1))::timestamp AT TIME ZONE 'Asia/Kolkata') AND ($2::text IS NULL OR site=$2) AND ($3::text IS NULL OR path=$3)`;
  const jobs: Record<string, Promise<Row[]>> = {
    totals: query(
      `SELECT count(*) FILTER(WHERE kind='pageview')::int AS views, count(DISTINCT visitor) FILTER(WHERE kind='pageview')::int AS visitors,count(*) FILTER(WHERE kind LIKE 'resume_%')::int AS downloads, min(created_at)::text AS first FROM personal_admin.events WHERE ${where}`,
      values,
    ),
    pages: query(
      `SELECT site,path,count(*) FILTER(WHERE kind='pageview')::int AS views,count(DISTINCT visitor) FILTER(WHERE kind='pageview')::int AS visitors,max(created_at)::text AS last FROM personal_admin.events WHERE ${where} GROUP BY site,path ORDER BY views DESC`,
      values,
    ),
    daily: query(
      `SELECT to_char(created_at AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD') AS day,count(*)::int AS views,count(DISTINCT visitor)::int AS visitors FROM personal_admin.events WHERE ${where} AND kind='pageview' GROUP BY day ORDER BY day`,
      values,
    ),
    legacy: query(
      `SELECT slug,title,views FROM "BlogPostViews" ORDER BY views DESC`,
    ),
    coverage: query(
      `SELECT site,count(*)::int AS views,min(created_at)::text AS first,max(created_at)::text AS last FROM personal_admin.events WHERE kind='pageview' GROUP BY site`,
    ),
  };
  for (const field of ["device", "browser", "os", "referrer", "kind"])
    jobs[field] = query(
      `SELECT ${field} AS name,count(*)::int AS count FROM personal_admin.events WHERE ${where} ${field !== "kind" ? "AND kind='pageview'" : ""} GROUP BY ${field} ORDER BY count DESC LIMIT 12`,
      values,
    );
  const results = await Promise.allSettled(Object.values(jobs));
  const data: Record<string, Row[]> = {};
  const errors: string[] = [];
  Object.keys(jobs).forEach((key, i) => {
    const result = results[i];
    if (result.status === "fulfilled") data[key] = result.value;
    else {
      data[key] = [];
      errors.push(key);
    }
  });
  const known = catalogue.filter(
    (row) => (!site || row.site === site) && (!path || row.path === path),
  );
  const knownKeys = new Set(known.map((row) => row.site + row.path));
  const pages = [
    ...known,
    ...(data.pages || [])
      .filter((row) => !knownKeys.has(String(row.site) + row.path))
      .map((row) => ({
        site: String(row.site),
        path: String(row.path),
        title: String(row.path),
        type: "Page",
      })),
  ]
    .map((row) => {
      const tracked = data.pages.find(
        (x) => x.site === row.site && x.path === row.path,
      );
      const legacy =
        row.site === "blogs" && row.type === "Post"
          ? data.legacy.find(
              (x) =>
                String(x.slug)
                  .replace(/^\/blog\//, "")
                  .replace(/^\/|\/$/g, "") === row.path.replace("/blog/", ""),
            )
          : undefined;
      return {
        ...row,
        views: tracked?.views ?? 0,
        visitors: tracked?.visitors ?? 0,
        legacy: legacy?.views ?? null,
      };
    })
    .sort((a, b) => Number(b.views) - Number(a.views));
  return { data, pages, errors };
}
export async function databaseStatus() {
  const start = Date.now();
  try {
    const [info] = await query(
      `SELECT current_database() AS database, pg_database_size(current_database())::text AS bytes,now()::text AS checked`,
    );
    const counts = await query(
      `SELECT 'Runs' AS name,count(*)::int AS count FROM "Runs" UNION ALL SELECT 'Blog counters',count(*)::int FROM "BlogPostViews" UNION ALL SELECT 'Subscribers',count(*)::int FROM "NewsletterSubscribers" UNION ALL SELECT 'Guitar results',count(*)::int FROM blog_guitar_leaderboard UNION ALL SELECT 'Analytics events',count(*)::int FROM personal_admin.events`,
    );
    const [latest] = await query(
      `SELECT max("updatedAt")::text AS last_sync FROM "Runs"`,
    );
    return {
      ok: true,
      latency: Date.now() - start,
      info,
      counts,
      lastSync: latest.last_sync,
      error: null,
    };
  } catch {
    return {
      ok: false,
      latency: Date.now() - start,
      info: null,
      counts: [],
      lastSync: null,
      error: "Database check failed. Connection or permissions need attention.",
    };
  }
}
