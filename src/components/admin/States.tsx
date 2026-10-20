import { DatabaseZap } from "lucide-react";

/** Loading placeholder shaped like an admin page. */
export function PageSkeleton({ kpis = false, rows = 6 }: { kpis?: boolean; rows?: number }) {
  return (
    <div className="ad-page" aria-busy="true" aria-label="Loading">
      <div>
        <div className="ad-skel" style={{ width: 240, height: 30 }} />
        <div className="ad-skel" style={{ width: 320, height: 14, marginTop: 10 }} />
      </div>
      {kpis && <div className="ad-skel" style={{ height: 96 }} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="ad-skel" style={{ height: 40, opacity: 1 - i * 0.1 }} />
        ))}
      </div>
    </div>
  );
}

export function DbMissing() {
  return (
    <div className="ad-page">
      <div className="ad-empty">
        <div className="ad-empty-icon">
          <DatabaseZap size={20} />
        </div>
        <h4>Database not connected</h4>
        <p className="ad-muted" style={{ maxWidth: 480, margin: 0 }}>
          Set DATABASE_URL (Neon) in the environment, run <code>npm run db:migrate</code> and <code>npm run db:seed</code>, then reload.
        </p>
      </div>
    </div>
  );
}
