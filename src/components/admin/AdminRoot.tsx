"use client";

import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";

type Theme = "light" | "dark";
type Tone = "ok" | "err";
interface Toast {
  id: number;
  text: string;
  tone: Tone;
}

interface AdminUi {
  theme: Theme;
  toggleTheme: () => void;
  toast: (text: string, tone?: Tone) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
}

interface ConfirmOpts {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

const Ctx = createContext<AdminUi | null>(null);
const THEME_KEY = "ovdc.admin.theme";

export function useAdminUi() {
  const v = use(Ctx);
  if (!v) throw new Error("useAdminUi must be used inside <AdminRoot>");
  return v;
}

/** Theme, toasts and the confirm dialog for every admin screen. */
export function AdminRoot({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const seq = useRef(0);
  const confirmBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {}
    // Sync with the theme saved on this device (not known during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "dark") setTheme("dark");
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const n = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, n);
      } catch {}
      return n;
    });
  }, []);

  const toast = useCallback((text: string, tone: Tone = "ok") => {
    const id = ++seq.current;
    setToasts((l) => [...l.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((l) => l.filter((t) => t.id !== id)), tone === "err" ? 6000 : 3500);
  }, []);

  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })), []);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  useEffect(() => {
    if (!dialog) return;
    confirmBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dialog.resolve(false);
        setDialog(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog]);

  return (
    <Ctx value={{ theme, toggleTheme, toast, confirm }}>
      <div className="adm" data-theme={theme}>
        {children}
        <div className="ad-toasts" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="ad-toast" data-tone={t.tone}>
              {t.tone === "ok" ? <CircleCheck size={16} /> : <CircleAlert size={16} />}
              <span style={{ flex: 1 }}>{t.text}</span>
              <button
                type="button"
                className="ad-btn ad-btn-icon"
                style={{ width: 24, height: 24, color: "inherit" }}
                aria-label="Dismiss"
                onClick={() => setToasts((l) => l.filter((x) => x.id !== t.id))}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        {dialog && (
          <div className="ad-backdrop" onClick={() => close(false)}>
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="ad-confirm-title"
              className={`ad-dialog ${dialog.danger ? "ad-dialog-danger" : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ad-dialog-body">
                <h4 id="ad-confirm-title">{dialog.title}</h4>
                {dialog.body && <div className="ad-muted" style={{ fontSize: 13.5 }}>{dialog.body}</div>}
              </div>
              <div className="ad-dialog-actions">
                <button type="button" className="ad-btn ad-btn-secondary" onClick={() => close(false)}>
                  Cancel
                </button>
                <button
                  ref={confirmBtn}
                  type="button"
                  className={`ad-btn ${dialog.danger ? "ad-btn-danger" : "ad-btn-primary"}`}
                  onClick={() => close(true)}
                >
                  {dialog.confirmLabel ?? "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Ctx>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
      <span style={{ fontFamily: "var(--a-display)", fontWeight: 600, fontSize: size, letterSpacing: ".04em" }}>OVDC</span>
      <span style={{ fontSize: size * 0.31, letterSpacing: ".24em", textTransform: "uppercase", marginTop: 2, color: "var(--a-muted)" }}>
        Property Developers
      </span>
    </span>
  );
}
