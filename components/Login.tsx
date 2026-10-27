"use client";
import { useState } from "react";
import { ArrowRight, Command } from "lucide-react";
export default function Login() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const password = new FormData(event.currentTarget).get("password");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      location.assign("/");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in");
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <div className="login-inner">
        <div className="brand">
          <span className="brand-icon">
            <Command size={19} />
          </span>{" "}
          personal<span className="muted">/ admin</span>
        </div>
        <p className="eyebrow">My workspace</p>
        <h1>
          Everything,
          <br />
          in one place.
        </h1>
        <p className="muted">
          A small window into all the things I put on the internet.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="password">Admin password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
            autoFocus
          />
          <button className="primary" disabled={busy}>
            {busy ? "Opening…" : "Sign in"}
            <ArrowRight size={16} />
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
        <span className="login-foot">Personal-Admin · Russel Daniel Paul</span>
      </div>
      <div className="login-art" aria-hidden="true">
        <div />
        <div />
        <div />
        <span>
          A quiet corner
          <br />
          of the internet.
        </span>
      </div>
    </main>
  );
}
