import { CloudOff } from "lucide-react";

export function CloudinaryMissing() {
  return (
    <div className="ad-page">
      <div className="ad-empty">
        <div className="ad-empty-icon">
          <CloudOff size={20} />
        </div>
        <h4>File storage is not connected</h4>
        <p className="ad-muted" style={{ maxWidth: 520, margin: 0 }}>
          Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the environment (.env.local locally, Vercel project
          settings for the live site), then reload.
        </p>
      </div>
    </div>
  );
}
