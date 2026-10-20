/* Lucide-style line icons used across the site (inline so they inherit currentColor). */

type P = { size?: number; className?: string; stroke?: string };

const base = (size = 16, stroke = "currentColor") => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke,
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const Icon360 = ({ size = 14, stroke = "var(--color-gold)", className }: P) => (
  <svg {...base(size, stroke)} strokeWidth={2} className={className}>
    <circle cx="12" cy="12" r="3" />
    <ellipse cx="12" cy="12" rx="10" ry="4.5" />
  </svg>
);

export const IconChevronDown = ({ size = 12, className }: P) => (
  <svg {...base(size)} strokeWidth={2.2} className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconMenu = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 8h16M4 16h16" />
  </svg>
);

export const IconClose = ({ size = 20 }: P) => (
  <svg {...base(size)} strokeWidth={2}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const IconSearch = ({ size = 16 }: P) => (
  <svg {...base(size)} strokeWidth={2}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const IconWhatsApp = ({ size = 22, stroke = "currentColor" }: P) => (
  <svg {...base(size, stroke)} strokeWidth={2}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </svg>
);

export const IconPhone = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </svg>
);

export const IconHeart = ({ size = 16, filled }: P & { filled?: boolean }) => (
  <svg {...base(size)} fill={filled ? "var(--color-gold)" : "none"}>
    <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />
  </svg>
);

export const IconShare = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </svg>
);

export const IconCheck = ({ size = 18, stroke = "var(--color-gold)" }: P) => (
  <svg {...base(size, stroke)} strokeWidth={2.2}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconGrid = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
  </svg>
);

export const IconMap = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3zM9 3v15M15 6v15" />
  </svg>
);

export const IconPhotos = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="M3 3h18v18H3zM3 16l5-5 4 4 3-3 6 6M15 8h.01" />
  </svg>
);

export const IconVideo = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="M2 6h14v12H2zM16 10l6-4v12l-6-4" />
  </svg>
);

export const IconCube = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10" />
  </svg>
);

export const IconInstagram = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01" />
  </svg>
);

export const IconFacebook = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const IconYouTube = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

export const IconLinkedIn = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export const IconPath = ({ d, size = 20, stroke = "currentColor" }: P & { d: string }) => (
  <svg {...base(size, stroke)} strokeWidth={1.6}>
    <path d={d} />
  </svg>
);
