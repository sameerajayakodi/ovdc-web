import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { Shell } from "@/components/admin/Shell";
import { requireAdmin } from "@/lib/admin/auth";
import { logout } from "../actions";

// Every console screen depends on the signed-in session and live data.
export const instant = false;

export default function ConsoleLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Shell
      user={
        <Suspense fallback={<div className="ad-skel" style={{ height: 34 }} />}>
          <UserCard />
        </Suspense>
      }
    >
      {children}
    </Shell>
  );
}

async function UserCard() {
  const admin = await requireAdmin();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          flex: "none",
          background: "var(--a-text)",
          color: "var(--a-bg)",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        {admin.initials}
      </span>
      <div className="ad-user-text" style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
        <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{admin.name}</div>
        <div style={{ fontSize: 11.5 }} className="ad-muted">
          {admin.username}
        </div>
      </div>
      <form action={logout} className="ad-user-out">
        <button className="ad-btn ad-btn-icon" title="Sign out" aria-label="Sign out">
          <LogOut size={16} />
        </button>
      </form>
    </div>
  );
}
