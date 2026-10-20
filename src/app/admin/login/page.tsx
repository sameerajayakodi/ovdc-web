import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/admin/AdminRoot";
import { ThemeButton } from "@/components/admin/Shell";
import { adminConfig } from "@/lib/admin/token";
import { LoginForm } from "./LoginForm";
import s from "./login.module.css";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  const configured = adminConfig() != null;
  return (
    <div className={s.wrap}>
      <div className={s.formSide}>
        <div className={s.brand}>
          <Wordmark size={30} />
          <span className="ad-tag ad-tag-neutral">Admin</span>
          <span style={{ marginLeft: "auto" }}>
            <ThemeButton />
          </span>
        </div>
        <div className={s.formBox}>
          <div className="ad-kicker ad-gold">Sign in</div>
          <h1 className={s.title}>Welcome back</h1>
          <p className="ad-muted" style={{ margin: "0 0 28px" }}>
            Manage projects, unit inventory and availability for ovdc.lk.
          </p>
          <Suspense fallback={<div className="ad-skel" style={{ height: 260 }} />}>
            <LoginForm configured={configured} />
          </Suspense>
        </div>
        <div className={s.foot}>
          <span>© 2026 OVDC Property Developers (Pvt) Ltd</span>
          <Link href="/">ovdc.lk</Link>
        </div>
      </div>
      <div className={s.panel} aria-hidden="true">
        <div className={s.panelTop}>
          <span>Inventory</span>
          <span>Projects</span>
          <span>360° Tours</span>
          <span>Website</span>
        </div>
        <div>
          <div className={s.big}>OVDC</div>
          <div className={s.rule} />
          <div className={s.line}>Every project, unit and price in one console.</div>
          <div className={s.places}>Colombo · Mount Lavinia · Negombo · Kandy</div>
        </div>
      </div>
    </div>
  );
}
