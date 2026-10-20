"use client";

import { useState } from "react";
import { submitLead } from "@/lib/leads";

export function NewsletterForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email") as string;
    setState("sending");
    const ok = await submitLead({ kind: "newsletter", email });
    setState(ok ? "done" : "error");
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label htmlFor="ovdc-news" style={{ fontSize: 14 }}>
        Launches, price lists and construction updates, once a month.
      </label>
      <div style={{ display: "flex", borderBottom: "1px solid var(--color-rule-dark-strong)" }}>
        <input
          id="ovdc-news"
          name="email"
          className="input"
          type="email"
          required
          autoComplete="email"
          placeholder="Email address"
          style={{ flex: 1, border: 0, boxShadow: "none", color: "var(--color-on-navy)" }}
        />
        <button
          className="btn"
          type="submit"
          disabled={state === "sending" || state === "done"}
          style={{ color: "var(--color-on-navy-kicker)", padding: 0, minHeight: 48 }}
        >
          {state === "done" ? "Subscribed ✓" : state === "sending" ? "Sending…" : "Subscribe →"}
        </button>
      </div>
      {state === "error" && (
        <span role="alert" style={{ fontSize: 12, color: "var(--color-error)" }}>
          Couldn’t subscribe right now. Please try again.
        </span>
      )}
    </form>
  );
}
