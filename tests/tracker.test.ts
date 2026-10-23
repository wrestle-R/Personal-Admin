import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { randomUUID } from "node:crypto";
const source = readFileSync(
  new URL("../public/tracker.js", import.meta.url),
  "utf8",
);
function visit(
  storage: Map<string, string>,
  now: number,
  dnt = false,
  hostname = "blogs.russel.is-a.dev",
) {
  const requests: Record<string, string>[] = [];
  const context = {
    window: {},
    navigator: { webdriver: false, doNotTrack: dnt ? "1" : "0" },
    crypto: { randomUUID },
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    localStorage: {
      getItem: (k: string) => storage.get(k) || null,
      setItem: (k: string, v: string) => storage.set(k, v),
    },
    document: {
      visibilityState: "visible",
      referrer: "",
      readyState: "complete",
      addEventListener: () => {},
    },
    location: {
      pathname: "/movies",
      hostname,
      protocol: "https:",
    },
    history: { pushState() {}, replaceState() {} },
    addEventListener: () => {},
    setTimeout: (fn: () => void) => fn(),
    fetch: async (_url: string, options: { body: string }) => {
      requests.push(JSON.parse(options.body));
      return {};
    },
  };
  vm.runInNewContext(source, context);
  return requests;
}
test("reloads preserve a page visit ID across executions", () => {
  const storage = new Map<string, string>(),
    now = Date.now();
  const first = visit(storage, now),
    reload = visit(storage, now + 1000);
  assert.equal(first.length, 1);
  assert.equal(reload[0].session, first[0].session);
  assert.notEqual(reload[0].id, first[0].id);
});
test("thirty minutes of inactivity starts a new visit", () => {
  const storage = new Map<string, string>(),
    now = Date.now();
  const first = visit(storage, now),
    later = visit(storage, now + 31 * 60000);
  assert.notEqual(first[0].session, later[0].session);
});
test("Do Not Track sends no events", () => {
  assert.equal(visit(new Map(), Date.now(), true).length, 0);
});

test("localhost and preview deployments send no analytics", () => {
  assert.equal(visit(new Map(), Date.now(), false, "localhost").length, 0);
  assert.equal(
    visit(new Map(), Date.now(), false, "admin-preview.vercel.app").length,
    0,
  );
});
