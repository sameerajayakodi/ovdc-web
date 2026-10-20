# OVDC website

Public website for Ocean View Development Company: projects, live building explorer, 360° tours, unit pages and lead capture,
plus the admin console at `/admin` (dashboard, unit inventory, projects editor, activity log).
Built from the Claude Design files in `design/` (website and admin projects).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (prerenders ~290 pages)
npm run lint
npm run test:e2e   # Playwright tests (site + admin, desktop + phone) against the production build; uses your installed Chrome

npm run db:generate  # after editing src/db/schema.ts: write a migration to ./drizzle
npm run db:migrate   # apply migrations to Neon
npm run db:seed      # load the sample portfolio + inventory into an empty database (--reset to wipe and reload)
npm run db:seed-content  # copy the unit layouts (floor plans) and 360° tours from src/lib/data into Neon; skips rows that exist
```

Stack: Next.js 16 (App Router, Cache Components), React 19, TypeScript, CSS Modules, three.js (360° viewer), Leaflet (maps),
Neon Postgres + Drizzle ORM (over Neon's HTTPS/WebSocket driver).

## Environment

Set in Vercel (Production, Preview, Development) and in `.env.local` for local work — never commit them.

| Variable | What |
|---|---|
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | Neon connection strings (added by the Vercel ↔ Neon integration; scripts use the unpooled one) |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | The single admin login |
| `ADMIN_SESSION_SECRET` | 32+ random characters used to sign the admin session cookie |
| `ADMIN_NAME` | Name shown in the console (optional) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | File storage for the Media library, floor-plan drawings and 360° panoramas. Browsers upload straight to Cloudinary with a signature from a Server Action; files live under `ovdc/<project>/` |

Changing `ADMIN_PASSWORD` (or the secret) signs every existing admin session out. Without `DATABASE_URL` the website falls back to the sample data in `src/lib/data`.

## Admin console

`/admin` — protected by `src/proxy.ts` and re-checked in every page and Server Action (`requireAdmin()` in `src/lib/admin/auth.ts`).

- **Dashboard**: live unit split, stock value, availability by tower, homes by layout, projects, recent changes
- **Units**: floor grid / table per tower, status filter, search, type filter; single-unit panel (price, history, status, note) and bulk status / price changes; CSV export
- **Projects**: list with filters and CSV export; editor for details, stage, pricing, location, publishing; new drafts; delete drafts
- **Leads**: pipeline board and table, filters, bulk stage/assign, CSV, lead drawer with notes, follow-ups, duplicate merge
- **Site visits**: week/day/month/list calendar, booking, confirm/reschedule/complete/no-show, hourly capacity per location
- **360° Tours**: tours list; editor with scenes (drag to reorder), panorama upload, click-to-place room links and info points on the unwrapped panorama, starting view, live 3D preview, publish; or a Matterport / Kuula embed instead
- **Floor plans**: one layout per unit type with sizes, room dimensions (m / ft) and an uploaded drawing (image or PDF); feeds the project page, unit pages and explorer
- **Media library**: folders per project, type filters, drag-and-drop upload with progress, alt text, where each file is used, copy URL, move, delete (Cloudinary, served as WebP/AVIF)
- **Activity log**: every change and sign-in

Edits call `updateTag()` on the cache tags in `src/lib/cacheTags.ts`, so the public pages show the change on the next request.
Unpublished (draft) projects and tours are hidden from the website, lists and sitemap. Menu items marked *Soon* (sales, customers, website content, settings) are next.

## Where things live

| Path | What |
|---|---|
| `src/app/(site)/` | Pages with the site nav + footer |
| `src/app/tours/[id]` | Full-screen 360° tour (no site chrome) |
| `src/app/api/leads` | Every form posts here; stored in Neon for the Leads inbox (honeypot + per-IP throttle) |
| `src/app/admin/` | Admin console (login, dashboard, units, projects, activity) and its Server Actions |
| `src/db/` | Drizzle schema + Neon client; migrations in `drizzle/`, seed/migrate scripts in `scripts/` |
| `src/lib/api.ts` | The website's only data access layer: cached reads from Neon (projects, inventory, layouts, tours) with sample-data fallback |
| `src/lib/cloudinary.ts`, `src/lib/mediaUrl.ts` | Upload signing / deletes (server) and Cloudinary delivery URLs (anywhere) |
| `src/lib/data/` | Sample data: projects, inventory and tours (seed sources), content, news, careers, media |
| `src/lib/data/media.ts` | Photo registry (Unsplash stock until OVDC's own shoot) |
| `public/tours/ovr-type-c/` | 360° panoramas (Poly Haven, CC0), 4096 × 2048 |
| `design/` | Claude Design exports, prompts and the old Vite code backup |

## Pages

Home · Projects (grid/map, filters) · Project detail · Building explorer · Unit detail · 360° tour · 3D & 360° hub ·
Book a visit (4-step) · Contact · About · News + article · Gallery (lightbox) · Construction progress · FAQ (search) ·
Calculators (payment plan + loan) · Buyer's guide · Overseas buyers · Awards · Careers + role · Homeowner portal (request access) ·
Legal · Photo credits · Shortlist & compare · 404 · sitemap.xml · robots.txt

## Content OVDC must replace before launch

These are samples or placeholders, clearly marked in the data files:

- **Company facts**: name, logo, stats (`content.ts` → `stats`), story and milestones (`milestones`), leadership names and photos (`leadership`)
- **Contacts**: phone numbers, WhatsApp, emails (`company`, `offices`; also `care@`, `global@`, `careers@` addresses in pages)
- **Projects & prices**: edit in `/admin` (seeded from `projects.ts` / `inventory.ts`); long-form copy still in `projectContent.ts`
- **Photography**: `media.ts` — replace stock `src` URLs with OVDC photos in `/public/images`
- **360° tours**: replace files in `public/tours/<tour-id>/` with OVDC renders/captures (same names), then adjust hotspot `yaw`/`pitch` in `tours.ts` (in dev, `window.__tour` shows the camera's lon/lat)
- **Testimonials, brand ambassador, partner-bank logos, awards** (`[Ambassador name]`, `[Award title]` placeholders)
- **News and careers**: sample posts and roles in `editorial.ts`
- **Legal text**: `/legal` is a draft for counsel to review

## Before go-live

- Map tiles: set `NEXT_PUBLIC_MAP_TILES` / `NEXT_PUBLIC_MAP_ATTRIBUTION` to a keyed provider (MapTiler, Stadia). OSM's public tiles are for development only.
- Hero film: set `NEXT_PUBLIC_HERO_VIDEO` (e.g. `/media/hero.mp4`) when the drone film is ready.
- Connect `/api/leads` to the CRM, add spam protection (e.g. Turnstile) and email/WhatsApp notifications.
- Sinhala and Tamil: the switcher is in place and shows "coming soon" until translations exist.
