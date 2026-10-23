import { authenticated, privateJson } from "@/lib/auth";
import { query } from "@/lib/db";
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export async function GET(request: Request) {
  if (!authenticated(request))
    return privateJson({ error: "Sign in required" }, 401);
  try {
    const rows = await query(
      `SELECT name,"startDate","distanceKm","elapsedTimeMin",pace,description,splits FROM "Runs" ORDER BY "startDate" DESC`,
    );
    const lines = [
      [
        "Run",
        "Date",
        "Distance km",
        "Minutes",
        "Pace",
        "Description",
        "Split number",
        "Split JSON",
      ]
        .map(csvCell)
        .join(","),
    ];
    for (const row of rows) {
      const splits =
        Array.isArray(row.splits) && row.splits.length ? row.splits : [null];
      splits.forEach((split: unknown, i: number) =>
        lines.push(
          [
            row.name,
            new Date(row.startDate).toISOString(),
            row.distanceKm,
            row.elapsedTimeMin,
            row.pace,
            row.description,
            split ? i + 1 : "",
            split ? JSON.stringify(split) : "",
          ]
            .map(csvCell)
            .join(","),
        ),
      );
    }
    return new Response(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="running-history.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return privateJson({ error: "Unable to export runs" }, 503);
  }
}
