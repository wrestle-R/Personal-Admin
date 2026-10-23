"use client";
import { useState } from "react";
import { RefreshCw, LogOut, Download } from "lucide-react";
export function Logout() {
  return (
    <button
      className="logout"
      onClick={async () => {
        const response = await fetch("/api/auth", { method: "DELETE" });
        if (response.ok) location.assign("/login");
      }}
    >
      <LogOut size={15} /> Sign out
    </button>
  );
}
export function Sync() {
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState(""),
    [inactive, setInactive] = useState(false);
  async function sync() {
    setBusy(true);
    setResult("");
    setInactive(false);
    try {
      const response = await fetch("/api/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setInactive(data.code === "STRAVA_APP_INACTIVE");
        throw new Error(data.error || "Sync failed");
      }
      setResult(
        `${data.message}. ${data.inserted ?? data.newCount ?? 0} new, ${data.updated ?? 0} updated, ${data.failed ?? 0} failed.`,
      );
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel sync-panel">
      <div>
        <span className="eyebrow">REFRESH CENTER</span>
        <h2>A few more miles?</h2>
        <p className="muted">
          Pull the latest Strava activities into Runny. Existing runs are
          updated without duplicates.
        </p>
      </div>
      <div className="actions">
        <button className="primary" disabled={busy} onClick={sync}>
          <RefreshCw size={16} className={busy ? "spinning" : ""} />
          {busy ? "Syncing runs…" : "Sync Strava"}
        </button>
        <a className="button" href="/api/export">
          <Download size={15} /> Export CSV + splits
        </a>
      </div>
      <p aria-live="polite" className="sync-result">
        {result}
      </p>
      {inactive && (
        <a
          className="external"
          href="https://www.strava.com/settings/api"
          target="_blank"
          rel="noreferrer"
        >
          Open Strava API settings ↗
        </a>
      )}
    </section>
  );
}
