import assert from "node:assert/strict";
import test from "node:test";
import { POST as collect } from "../app/api/collect/route";
import { csvCell } from "../lib/csv";
import { readJsonObject, RequestBodyError } from "../lib/request-json";

test("the request reader counts bytes and requires a JSON object", async () => {
  const body = '{"name":"é"}';
  const request = () => new Request("https://admin.test", { method: "POST", body });
  const bytes = Buffer.byteLength(body);
  assert.deepEqual(await readJsonObject(request(), bytes), { name: "é" });
  await assert.rejects(readJsonObject(request(), bytes - 1), (error) =>
    error instanceof RequestBodyError && error.status === 413);
  await assert.rejects(readJsonObject(new Request("https://admin.test", {
    method: "POST", body: "null",
  }), bytes), (error) => error instanceof RequestBodyError && error.status === 400);
});

test("analytics throttles by the Vercel client address across browsers and header fallbacks", async (t) => {
  const hitsByKey = new Map<unknown, number>();
  let events = 0;
  const globalDb = globalThis as unknown as { adminPool?: { query: (sql: string, values: unknown[]) => unknown } };
  const oldPool = globalDb.adminPool;
  const oldEnv = { ...process.env };
  t.after(() => {
    globalDb.adminPool = oldPool;
    for (const name of ["DATABASE_URL", "SESSION_SECRET", "VERCEL"]) {
      if (oldEnv[name] === undefined) delete process.env[name];
      else process.env[name] = oldEnv[name];
    }
  });
  process.env.DATABASE_URL = "postgres://fixture.invalid/fixture";
  process.env.SESSION_SECRET = "collector-fixture";
  process.env.VERCEL = "1";
  globalDb.adminPool = {
    query(sql: string, values: unknown[]) {
      if (sql.includes("personal_admin.limits")) {
        const hits = (hitsByKey.get(values[0]) ?? 119) + 1;
        hitsByKey.set(values[0], hits);
        return { rows: [{ hits }] };
      }
      assert.match(sql, /INSERT INTO personal_admin.events/);
      events++;
      return { rows: [] };
    },
  };
  const request = (ua: string, forwarded: string, vercelIp: string, realIp: string) => new Request("https://admin.test/api/collect", {
    method: "POST",
    headers: {
      origin: "https://blogs.russel.is-a.dev",
      "user-agent": ua,
      "x-vercel-forwarded-for": vercelIp,
      "x-real-ip": realIp,
      "x-forwarded-for": forwarded,
    },
    body: JSON.stringify({
      session: "12345678-1234-4234-8234-123456789abc",
      path: "/posts",
      kind: "pageview",
    }),
  });
  assert.equal((await collect(request("Mozilla Chrome", "192.0.2.2", "192.0.2.1", "192.0.2.4"))).status, 204);
  assert.equal((await collect(request("Mozilla Firefox", "192.0.2.3", "", "192.0.2.1"))).status, 429);
  assert.equal((await collect(request("Mozilla Firefox", "192.0.2.3", "invalid", "192.0.2.4"))).status, 204);
  assert.equal(events, 2);
});

test("spreadsheet cells keep ordinary text and neutralize leading formula markers", () => {
  assert.equal(csvCell('Run, "Sunday"'), '"Run, ""Sunday"""');
  assert.equal(csvCell("  text"), '"  text"');
  for (const value of ["=", "  +", "\u00a0@", "\n", "\r", "\t"]) {
    assert.equal(csvCell(value), `"'${value}"`);
  }
});
