"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { login, type LoginState } from "./actions";

/**
 * Rendered into the static HTML, so the fields and button show even before
 * (or without) JavaScript. Reading the URL with useSearchParams() here would
 * turn the whole form into client-only output behind a loading placeholder.
 */
export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [show, setShow] = useState(false);
  const nextRef = useRef<HTMLInputElement>(null);

  // The page to return to after signing in (?next=…), filled in once the page loads.
  useEffect(() => {
    if (nextRef.current) nextRef.current.value = new URLSearchParams(window.location.search).get("next") ?? "";
  }, []);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }} noValidate>
      <input ref={nextRef} type="hidden" name="next" defaultValue="" />
      {!configured && (
        <div role="alert" className="ad-tag ad-tag-warn" style={{ whiteSpace: "normal", padding: "10px 12px", fontSize: 13 }}>
          Set ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET (32+ characters) in the environment to enable sign-in.
        </div>
      )}
      <div className="ad-field">
        <label htmlFor="lg-user">Username</label>
        <input
          id="lg-user"
          name="username"
          className="ad-input"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state.username}
          required
          autoFocus
        />
      </div>
      <div className="ad-field">
        <label htmlFor="lg-pw">Password</label>
        <div style={{ position: "relative" }}>
          <input
            id="lg-pw"
            name="password"
            className="ad-input"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "lg-err" : undefined}
            style={{ paddingRight: 44 }}
            required
          />
          <button
            type="button"
            className="ad-btn ad-btn-icon"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            style={{ position: "absolute", right: 0, top: 0, height: "100%" }}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {state.error && (
          <div id="lg-err" role="alert" className="ad-error">
            <CircleAlert size={14} />
            {state.error}
          </div>
        )}
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
        <input type="checkbox" name="remember" defaultChecked style={{ width: 15, height: 15, margin: 0 }} />
        Keep me signed in for 30 days
      </label>
      <button className="ad-btn ad-btn-primary ad-btn-lg ad-btn-split" type="submit" disabled={pending || !configured}>
        {pending ? "Signing in…" : "Sign in"}
        {pending ? <LoaderCircle size={18} className="ad-spin" /> : <ArrowRight size={18} />}
      </button>
      <div style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }} className="ad-muted">
        <ShieldCheck size={14} />
        Single admin account · sessions are signed and expire automatically.
      </div>
    </form>
  );
}
