# OVDC website

Public website for Ocean View Development Company: projects, live building explorer, 360° tours, unit pages and lead capture.
Built from the Claude Design files in `design/` (website project: Home, Projects, Project detail, 360° tour, design system v2).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (prerenders ~290 pages)
npm run lint
npm run test:e2e   # 69 Playwright tests (desktop + phone) against the production build; uses your installed Chrome
```

Stack: Next.js 16 (App Router, Cache Components), React 19, TypeScript, CSS Modules, three.js (360° viewer), Leaflet (maps).

## Where things live

| Path | What |
|---|---|
| `src/app/(site)/` | Pages with the site nav + footer |
| `src/app/tours/[id]` | Full-screen 360° tour (no site chrome) |
| `src/app/api/leads` | Every form posts here — **TODO: connect to the admin CRM** |
| `src/lib/api.ts` | The only data access layer. Swap the bodies for `fetch()` calls to the admin API later |
| `src/lib/data/` | Sample data: projects, inventory, content, tours, news, careers, media |
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
- **Projects & prices**: `projects.ts`, `inventory.ts`, `projectContent.ts` (sample data from the design)
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
