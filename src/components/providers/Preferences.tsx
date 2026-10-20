"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Currency } from "@/lib/types";
import { CURRENCIES } from "@/lib/money";

/* A tiny localStorage-backed store shared by every component (currency, shortlist). */

type Key = "ovdc.currency" | "ovdc.shortlist" | "ovdc.cookies";
const listeners = new Set<() => void>();

function read(key: Key): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: Key, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: keep in-memory only */
  }
  memory[key] = value;
  listeners.forEach((l) => l());
}

const memory: Partial<Record<Key, string>> = {};

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith("ovdc.")) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function useStored(key: Key, fallback: string, serverValue = fallback) {
  return useSyncExternalStore(
    subscribe,
    () => memory[key] ?? read(key) ?? fallback,
    () => serverValue,
  );
}

interface Prefs {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  shortlist: string[];
  toggleShortlist: (id: string) => boolean;
  toast: (msg: string) => void;
  /** "pending" until the visitor chooses, "unknown" while server-rendering */
  cookieConsent: "pending" | "unknown" | "all" | "essential";
  setCookieConsent: (v: "all" | "essential") => void;
}

const Ctx = createContext<Prefs | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const rawCur = useStored("ovdc.currency", "LKR");
  const currency = (CURRENCIES.includes(rawCur as Currency) ? rawCur : "LKR") as Currency;
  const rawList = useStored("ovdc.shortlist", "[]");
  const shortlist = useMemo<string[]>(() => {
    try {
      const v = JSON.parse(rawList);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }, [rawList]);

  const cookieConsent = useStored("ovdc.cookies", "pending", "unknown") as Prefs["cookieConsent"];

  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useCallback((m: string) => {
    clearTimeout(timer.current);
    setMsg(m);
    timer.current = setTimeout(() => setMsg(null), 2400);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const value = useMemo<Prefs>(
    () => ({
      currency,
      setCurrency: (c) => write("ovdc.currency", c),
      shortlist,
      toggleShortlist: (id) => {
        const on = !shortlist.includes(id);
        write("ovdc.shortlist", JSON.stringify(on ? [...shortlist, id] : shortlist.filter((x) => x !== id)));
        return on;
      },
      toast,
      cookieConsent,
      setCookieConsent: (v) => write("ovdc.cookies", v),
    }),
    [currency, shortlist, toast, cookieConsent],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {msg && (
        <div role="status" className="ovdc-toast">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2.2" aria-hidden>
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {msg}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function usePrefs() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePrefs must be used inside <PreferencesProvider>");
  return v;
}
