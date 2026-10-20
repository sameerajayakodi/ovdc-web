# OVDC — Design Brief for Claude Design (Website and Admin as separate projects)

Reference site: https://www.homelandsskyline.lk/ (Next.js front end, headless WordPress CMS, Matterport 360 tours opened in a modal from the "VR Experience" page and from each project page).

The website and the admin were designed as **two separate Claude Design projects**, so they get **two separate sets of prompts**:

| Claude Design project | Existing files | Prompts to run there |
|---|---|---|
| **Website** ("OVDC Premium Real Estate Website") | `OVDC Premium Real Estate Website.zip`, `OVDC Design System.html` | **Part A: W1 → W5** |
| **Admin** ("OVDC Admin Dashboard Design") | `OVDC Admin Dashboard Design.zip`, `OVDC Admin.html` | **Part B: A1 → A5** |

Rules:
- Each prompt is self-contained. Paste it only into its own project. A website prompt never mentions admin files, and an admin prompt never mentions website files.
- Both projects must still look like one brand. The **Shared brand block** below sits at the start of the **first** prompt in each project (W1 and A1), which keeps colours, statuses and sample data identical.
- Run one prompt per round and review before running the next. One giant prompt gives shallow results.
- After each round, check desktop 1440 and mobile 390, in both light and dark.
- Replace `[ ]` items with real OVDC facts before running.

---

## Shared brand block (already included in W1 and A1)

```
BRAND (must match the other OVDC project exactly):
- OVDC is a large Sri Lankan property developer (luxury apartments, houses, land).
- Colours: navy #0f1b2d (navy-2 #172840), warm gold #c4a05a, cream ground #f6f3ed, surface #ece7dd. Gold ramp: 100 #fbf5ea, 300 #e7d1a5, 400 #d8b97c, 600 #a9853f, 700 #86672c, 800 #604a20.
- Gold is for fills, rules, icons and display text 28px+ only. Gold text smaller than 28px uses #86672c on light grounds and #e7d1a5 on dark (WCAG AA).
- Type: Cormorant Garamond (display, 28px+ only) and Archivo (all UI and body). Square corners, 2px rules between major sections.
- Wordmark: serif "OVDC" with the company line underneath. No gold square logo. [Use the real OVDC logo if provided.]
- Inventory status colours (identical everywhere): Available = green #3f6b55, Reserved = amber #c98a2b, Sold = muted navy-grey #67707c, Blocked/Not released = diagonal hatch. Each status also shows an icon or letter (A / R / S / B) so it never relies on colour alone.
- Sample data is always Sri Lankan: prices in LKR Mn (e.g. "LKR 94.2 Mn"), "3 Bed" (never BHK), UDA approval numbers (never RERA), locations such as Colombo 03, Colombo 07, Mount Lavinia, Rajagiriya, Battaramulla, Negombo, Kandy, phones in +94 format, domain ovdc.lk. Never ₹, Cr, Lakh or Indian place names.
- Shared sample projects: Ocean View Residences (Mount Lavinia, apartments, under construction, from LKR 68.5 Mn), The Marine Crest (Colombo 03, luxury apartments, from LKR 112 Mn), Lagoon Terraces (Negombo, townhouses, from LKR 54 Mn), Kandy Hill Villas (Kandy, villas, upcoming). Shared sample unit: Ocean View Residences · Tower A · Unit 14B · Type C · 3 Bed + study · 1,980 sqft · LKR 94.2 Mn.
```

---

## 1. Review of the current designs

The direction is right: navy and gold with a serif display face looks premium and already sets OVDC apart from Home Lands. The 360° tour viewer (scene filmstrip, floor-plan minimap with a view cone, day/night switch, unit sidebar with Reserve/Book CTAs) already does more than the reference site's Matterport modal. Keep all of that.

### Website project
| # | Problem | Fix (prompt) |
|---|---------|-----|
| W1 | The hero is a flat navy block with no photo or video. | Full-bleed drone video/photo with a navy gradient (W1). |
| W2 | The image-slot placeholder text ("drop files…") overlaps the hero headline. | Put the media behind the text layer (W1). |
| W3 | Amenities: the right card row overflows off the page at 1440px, with no arrows. | 3×2 grid, or a proper carousel (W1). |
| W4 | Gold text on cream is about 2.2:1 contrast. Small kickers and prices fail WCAG. | Use the deep gold #86672c for small text (W1). |
| W5 | Cormorant Garamond looks thin below 24px. | Cormorant only at 28px and up (W1). |
| W6 | Placeholder stats and "[Ambassador name]". | Real OVDC figures before W2. |
| W7 | No Sri Lankan trust signals. | UDA, CMA, partner banks, awards (W1). |
| W8 | Prices are LKR only, but many buyers live abroad. | LKR / USD / AUD / AED switch, plus an Overseas buyers page (W1, W4). |
| W9 | Cookie banner and WhatsApp button collide on mobile. | Stack them (W1). |

### Admin project
| # | Problem | Fix (prompt) |
|---|---------|-----|
| A1 | The Projects and Units screens still use the old Modernist **red** theme. Only the Dashboard is in navy and gold. | Re-theme everything (A1). |
| A2 | Sample data is Indian: ₹, Cr/L, BHK, RERA, Whitefield/Hebbal, 99acres, ovdc.in. | Sri Lankan data (A1). |
| A3 | Units grid: Sold is a heavy black block and Reserved is pale peach, and status is shown by colour alone. | Shared status colours plus icons (A1). |
| A4 | The Dashboard's lower half is empty. | Funnel, collections, leaderboard (A1). |
| A5 | The admin logo (gold square plus sans-serif) doesn't match the website. | Serif wordmark (A1). |
| A6 | Missing modules: tour editor, building mapper, reservations, price lists, content, roles, audit. | A2 to A4. |

---

## 2. The "3D" features: what to build and how

1. **360° panorama tours (the core).** Equirectangular 2:1 images, 8K. **Completed** units are shot with an Insta360 X4/X5 or Ricoh Theta. **Off-plan** units are rendered as 360° stills by the 3D artist (Lumion, D5 or Enscape). Most OVDC projects will need renders, because the apartments aren't built yet. Use your own viewer (Photo Sphere Viewer or Marzipano, with tiled images) so it stays on-brand and leads go into your CRM.
2. **Matterport / Kuula embed support**, for show apartments that are already scanned. This is what Home Lands does.
3. **Interactive building explorer (the differentiator).** Hovering the tower render highlights a floor. Clicking a floor shows the floor plate coloured by live availability. Clicking a unit opens its detail page and 360° tour. Home Lands does not have this.

The website shows these features (W3). The admin manages them through the 360° Tour editor and Building mapper (A2). The two must use the same status colours and the same sample unit.

---

# PART A: WEBSITE PROJECT

Open the **Website** project in Claude Design (or attach `OVDC Premium Real Estate Website.zip` and `OVDC Design System.html`). Run W1 → W5.

## W1: Brand alignment, design system v2, Home fixes

```
We are continuing the OVDC website project. Keep the existing navy + gold direction, the 360° tour viewer and the Home page structure. This round: upgrade the design system to v2 and fix the Home page.

BRAND (must match the other OVDC project exactly):
- OVDC is a large Sri Lankan property developer (luxury apartments, houses, land).
- Colours: navy #0f1b2d (navy-2 #172840), warm gold #c4a05a, cream ground #f6f3ed, surface #ece7dd. Gold ramp: 100 #fbf5ea, 300 #e7d1a5, 400 #d8b97c, 600 #a9853f, 700 #86672c, 800 #604a20.
- Gold is for fills, rules, icons and display text 28px+ only. Gold text smaller than 28px uses #86672c on light grounds and #e7d1a5 on dark (WCAG AA).
- Type: Cormorant Garamond (display, 28px+ only) and Archivo (all UI and body). Square corners, 2px rules between major sections.
- Wordmark: serif "OVDC" with the company line underneath. No gold square logo. [Use the real OVDC logo if provided.]
- Inventory status colours (identical everywhere): Available = green #3f6b55, Reserved = amber #c98a2b, Sold = muted navy-grey #67707c, Blocked/Not released = diagonal hatch. Each status also shows an icon or letter (A / R / S / B) so it never relies on colour alone.
- Sample data is always Sri Lankan: prices in LKR Mn (e.g. "LKR 94.2 Mn"), "3 Bed" (never BHK), UDA approval numbers (never RERA), locations such as Colombo 03, Colombo 07, Mount Lavinia, Rajagiriya, Battaramulla, Negombo, Kandy, phones in +94 format, domain ovdc.lk. Never ₹, Cr, Lakh or Indian place names.
- Shared sample projects: Ocean View Residences (Mount Lavinia, apartments, under construction, from LKR 68.5 Mn), The Marine Crest (Colombo 03, luxury apartments, from LKR 112 Mn), Lagoon Terraces (Negombo, townhouses, from LKR 54 Mn), Kandy Hill Villas (Kandy, villas, upcoming). Shared sample unit: Ocean View Residences · Tower A · Unit 14B · Type C · 3 Bed + study · 1,980 sqft · LKR 94.2 Mn.

DESIGN SYSTEM v2 (update the design-system page so it documents every rule):
1. Contrast table for every text/background pair we use (target WCAG AA).
2. Full type scale for desktop and mobile: display, h1–h4, body-lg, body, small, label/kicker, tabular numerals for prices and unit numbers.
3. The status colours above, shown as tags, as unit cells and as building-floor highlights.
4. Photography: full-colour, warm, golden-hour architecture and interiors. Navy gradient overlay (bottom 60%) under any text on images. Aspect ratios: hero 16:9 / mobile 4:5, project card 4:3, unit card 3:2.
5. New components: currency switcher (LKR / USD / AUD / AED), language switcher (English / සිංහල / தமிழ்), price display (primary currency + small LKR line), unit spec row (beds, baths, sqft, floor, facing), status tag, 360° badge, sticky mobile enquiry bar (Call / WhatsApp / Enquire), WhatsApp button, toast, skeleton loaders, empty states, form field with error/success, stepper, tabs, accordion, site-visit date picker, lightbox, map pin card.
6. Motion: 300–600ms ease-out, fade-up on scroll, slow image zoom on hover; respect prefers-reduced-motion.

HOME FIXES:
- Hero: full-bleed drone video/photo of a sea-facing tower at golden hour with a navy gradient. The media sits BEHIND the text. Nothing may overlap the headline (the current image-slot text overlaps it — fix that).
- Add a quick search bar under the hero: Location, Property type, Bedrooms, Budget (LKR), Status, Search.
- Stats row: [real OVDC numbers].
- Amenities: the right-hand card row currently overflows off the page. Replace it with a 3×2 image grid with captions, or a carousel with arrows and a visibly cropped last card.
- Add an "Explore in 3D" band teasing the building explorer and 360° tour.
- Add a trust strip: UDA approved, CMA registered, partner banks for housing loans (logo placeholders), awards.
- Add a construction progress teaser (latest site photo + % complete per project).
- Small gold kickers and prices switch to #86672c.
- Mobile: the cookie banner and the WhatsApp button must not overlap.
Show Home at desktop 1440 and mobile 390, light and dark.
```

## W2: Core pages

```
Using the OVDC website design system v2, design the core public pages at desktop 1440 and mobile 390 (light mode). Use the shared sample projects and Sri Lankan data from the design system.

1. Projects listing: filters (location, type, status, bedrooms, price range with currency switch), grid / map toggle (map pins with price cards), sort, result count, "Has 360° tour" chip, load more, empty state.
2. Project detail (most important page): hero gallery with Photos / Videos / 360° Tour / 3D Building tabs; sticky sub-nav (Overview, Building explorer, Floor plans, Amenities, Specifications, Location, Payment plan, Progress, FAQ); key facts bar (location, units, floors, completion date, UDA no., starting price); amenities icon grid (45+); unit types table (type, beds, sqft, from price, availability, "View 360°"); specifications accordion (structure, floor finishes, bathroom, pantry, electrical, doors/windows, waterproofing, termite treatment); location map with nearby places and travel minutes; payment plan (e.g. 20% booking + construction-linked instalments); construction progress timeline with monthly photos and % complete; brochure download gated by a 3-field form; FAQ; similar projects; sticky enquiry card on desktop and a sticky bottom bar on mobile.
3. Unit detail (use Unit 14B): gallery + 360° tour launcher, floor plan with dimensions, position on the floor plate, specs (beds, baths, interior sqft, balcony sqft, floor, facing, view, parking), price in selected currency + price per sqft, status tag, "Reserve this unit" and "Book a site visit", compare toggle, save to shortlist, share, similar units.
4. VR / 360° Experience hub: all tours as cards with a project filter, opening the tour viewer.
5. About (story, leadership, vision/mission, milestones timeline, awards), Contact (offices with maps, hotline, WhatsApp, form, hours), Book a site visit (steps: project → date & time slot → details → confirmation).
6. 404 page and Thank-you page.
```

## W3: 3D experience (flagship)

```
Design the full OVDC 3D experience in dark immersive navy, desktop 1440 and mobile 390, building on the existing 360° tour viewer in this project. Use Ocean View Residences, Tower A, Unit 14B.

1. INTERACTIVE BUILDING EXPLORER (new):
- Full-screen exterior render of the tower. Hovering a floor highlights it in gold with a tooltip: "Floor 14 · 4 of 6 units available · from LKR 82 Mn".
- Left rail: project name, Tower A / Tower B switch, floor list with availability counts, filters (beds, price, sea view / city view).
- Clicking a floor opens the floor plate: a top-down plan with each unit coloured by status (Available green, Reserved amber, Sold muted, Blocked hatched, each with its letter). Hovering a unit shows a card (beds, sqft, facing, price). Clicking opens a unit panel: Open 360° tour, Floor plan, Reserve, Enquire.
- Day / sunset / night exterior switch, compass with sea/city labels.
- Mobile: tower image on top, tappable floor list below, floor plate as a full-screen sheet.

2. 360° TOUR VIEWER (refine):
- Keep the filmstrip, floor-plan minimap with view cone, day/night toggle, info hotspots and the unit sidebar.
- Add: loading state with progress and a blurred low-res preview; gyroscope mode on mobile; VR/cardboard button; auto-rotate; guided tour mode (auto-plays scenes with captions); "Finishes" hotspots opening a material card (brand, size, photo); room dimensions overlay; share-this-view link; an in-tour enquiry drawer that captures the lead without leaving the tour; a Matterport-embed variant for projects that use it; error / slow connection state.

3. COMPARE & SHORTLIST: shortlist drawer; compare up to 3 units side by side (photo, 360° link, price, price/sqft, beds, baths, sqft, floor, facing, completion, payment plan).

4. CALCULATORS: payment-plan calculator (unit price, booking %, milestone schedule table, total); housing loan calculator (amount, rate, tenure, monthly instalment, partner bank). Selected currency with LKR underneath.
```

## W4: Content and supporting pages

```
Design the remaining OVDC website pages in design system v2, desktop 1440 + mobile 390:
1. News & Blog listing (categories, featured article, search) and article page (reading time, share, related posts, enquiry CTA).
2. Buyer's guide for Sri Lanka (selection → reservation → agreement → payments → handover → deed; documents checklist; PDF download).
3. Overseas buyers (buying from abroad, foreign currency payments, virtual tours, power of attorney guidance, international contacts, time-zone friendly call booking).
4. Gallery (project filter, photos / videos / drone, lightbox).
5. Construction progress per project (monthly timeline, photo sets, % complete per tower, drone video).
6. Careers + job detail with apply form and CV upload.
7. FAQ (grouped, searchable accordion). 8. Awards & certifications.
9. Customer portal for buyers after login: my unit, payment schedule (paid / due / overdue), receipts, construction updates, documents, support tickets.
10. Legal page template (privacy, terms, cookies).
Also show the mega menu (projects by status with thumbnails), mobile menu, currency/language switchers in context, and the footer.
```

## W5: Website polish and handoff

```
Final consistency pass on the OVDC website project:
- Every screen uses design-system tokens only; no stray hex values.
- WCAG AA contrast, visible focus states, keyboard order, alt text placeholders, 44px touch targets on mobile.
- Sample data is Sri Lankan and consistent everywhere (same projects, prices and unit numbers on Home, Project detail, Unit detail, building explorer and 360° tour).
- Handoff page: page inventory with links, component list with variants, token tables, breakpoints (390 / 768 / 1024 / 1440), required image sizes (hero 2560×1440, panoramas 8192×4096 equirectangular, floor plans SVG), and the list of content OVDC must supply.
```

---

# PART B: ADMIN PROJECT

Open the **Admin** project in Claude Design (or attach `OVDC Admin Dashboard Design.zip` and `OVDC Admin.html`). Run A1 → A5.

## A1: Re-theme and fix existing screens

```
We are continuing the OVDC Admin project. Keep the existing layout: sidebar groups (Overview, Inventory, CRM, Website, Admin), top bar with search, theme toggle and notifications, the login and forgot-password flow, and the Dashboard / Projects / Units screens. This round fixes them.

BRAND (must match the other OVDC project exactly):
- OVDC is a large Sri Lankan property developer (luxury apartments, houses, land).
- Colours: navy #0f1b2d (navy-2 #172840), warm gold #c4a05a, cream ground #f6f3ed, surface #ece7dd. Gold ramp: 100 #fbf5ea, 300 #e7d1a5, 400 #d8b97c, 600 #a9853f, 700 #86672c, 800 #604a20.
- Gold is for fills, rules, icons and display text 28px+ only. Gold text smaller than 28px uses #86672c on light grounds and #e7d1a5 on dark (WCAG AA).
- Type: Cormorant Garamond (display, 28px+ only) and Archivo (all UI and body). Square corners, 2px rules between major sections.
- Wordmark: serif "OVDC" with the company line underneath. No gold square logo. [Use the real OVDC logo if provided.]
- Inventory status colours (identical everywhere): Available = green #3f6b55, Reserved = amber #c98a2b, Sold = muted navy-grey #67707c, Blocked/Not released = diagonal hatch. Each status also shows an icon or letter (A / R / S / B) so it never relies on colour alone.
- Sample data is always Sri Lankan: prices in LKR Mn (e.g. "LKR 94.2 Mn"), "3 Bed" (never BHK), UDA approval numbers (never RERA), locations such as Colombo 03, Colombo 07, Mount Lavinia, Rajagiriya, Battaramulla, Negombo, Kandy, phones in +94 format, domain ovdc.lk. Never ₹, Cr, Lakh or Indian place names.
- Shared sample projects: Ocean View Residences (Mount Lavinia, apartments, under construction, from LKR 68.5 Mn), The Marine Crest (Colombo 03, luxury apartments, from LKR 112 Mn), Lagoon Terraces (Negombo, townhouses, from LKR 54 Mn), Kandy Hill Villas (Kandy, villas, upcoming). Shared sample unit: Ocean View Residences · Tower A · Unit 14B · Type C · 3 Bed + study · 1,980 sqft · LKR 94.2 Mn.

ADMIN-SPECIFIC: in the admin UI, use Archivo for all UI text. Cormorant is used only for the wordmark and the login page headline. Light mode uses a white/cream ground; dark mode uses navy.

FIXES:
1. The Projects and Units screens still use the old red Modernist theme (#ec3013). Re-theme EVERY screen and component (buttons, segmented controls, tags, selects, tables, unit grid) to the OVDC navy + gold tokens. No red anywhere except for real errors/destructive actions.
2. Replace all Indian sample data with the Sri Lankan data above: LKR Mn instead of ₹/Cr/L, "3 Bed" instead of BHK, "UDA/…" approval numbers instead of RERA, Sri Lankan locations instead of Whitefield/Hebbal/Sarjapur, lead sources Website / Facebook / Google Ads / ikman.lk / LankaPropertyWeb / WhatsApp / Walk-in / Referral instead of 99acres, "7 live on ovdc.lk" instead of ovdc.in, Sri Lankan customer and agent names.
3. Units floor grid: use the shared status colours with letters (Sold is no longer a heavy black block; Reserved is no longer pale peach). Add a legend. The selected unit gets a 2px gold outline.
4. Replace the gold-square logo in the sidebar with the serif OVDC wordmark.
5. Dashboard: fill the empty lower half. Add a sales funnel (Lead → Site visit → Reservation → Agreement → Handover), collections due this month (LKR), an agent leaderboard (leads, visits, sales), and tour-view → lead conversion. Keep the KPIs, leads-over-time chart, top viewed projects, recent inquiries and upcoming site visits.
Show desktop 1440 light and dark.
```

## A2: Inventory modules (incl. 360° tour editor and building mapper)

```
Design the OVDC Admin inventory modules in the re-themed navy + gold admin, desktop 1440, light mode (one dark example), with Sri Lankan sample data.

1. Project editor (opened from Projects list): tabs for Basic info, Media (gallery, videos, drone, brochure PDF), Amenities (icon picker), Specifications, Location (map pin, nearby places with travel minutes), Unit types, Payment plans, Construction progress (monthly updates with photos and % complete), FAQ, SEO (meta title, description, OG image, slug, Google preview), Visibility & scheduling. Sticky save bar with Draft / Submit for approval / Publish.
2. Units: the floor grid + table view; bulk select → change status or price; unit side panel (details, price history, linked lead/customer, linked 360° tour); CSV import with a validation preview showing error rows.
3. Building mapper (new): upload the tower elevation render, draw or adjust a polygon for each floor, upload each floor plate, draw a shape for each unit, link shapes to unit records, then preview it as it will look on the website (floors coloured by availability).
4. 360° Tour editor (new): upload equirectangular panoramas (resolution check: 2:1, minimum 6K) or paste a Matterport/Kuula URL instead; scene list with drag reorder; click inside the live panorama to place navigation hotspots (link to another scene) and info hotspots (title, text, image); set the initial view angle; day/night variant per scene; place each scene on the floor-plan minimap; processing/tiling progress state; preview and publish. Use Unit 14B with scenes Living Room, Kitchen, Master Bedroom, Bathroom, Balcony View.
5. Floor plans: upload, map to unit types, dimensions.
6. Price lists: prices per unit/type with effective dates, version history with diff, approval before publishing.
7. Media library: folders per project, filters (image / video / 360 / PDF), bulk upload with progress, alt text, "used in 3 places", storage usage.
```

## A3: Sales & CRM

```
Design the OVDC Admin sales and CRM modules, desktop 1440, re-themed navy + gold, Sri Lankan data (LKR, +94 numbers, Sri Lankan names, sources: Website, Facebook, Google Ads, ikman.lk, LankaPropertyWeb, WhatsApp, Walk-in, Referral).

1. Leads: Kanban pipeline by stage (New, Contacted, Site visit, Negotiation, Reserved, Won, Lost) and a table view; filters by project, source, agent, date; lead detail with activity timeline (calls, WhatsApp, emails, site visits, notes), the 360° tours they viewed and time spent, assign agent, follow-up reminders, duplicate detection and merge.
2. Site visits: calendar (day / week / month), slot capacity, agent assignment, confirm / reschedule / no-show, SMS/WhatsApp reminder status.
3. Reservations & sales (new): reserve a unit for a customer with an expiry countdown, booking fee, agreement status, payment schedule by construction milestone, record a payment, receipt PDF, overdue alerts.
4. Customers: profile, units owned, payment history, documents, customer-portal access toggle.
```

## A4: Website content, users and settings

```
Design the remaining OVDC Admin modules, desktop 1440, navy + gold, Sri Lankan data.

WEBSITE CONTENT
- Pages: home sections editor with drag reorder and live preview; Banners & popups; News/Blog (rich editor, categories, scheduling); Testimonials (text + video); Awards; FAQs; Careers (jobs + applications inbox); Forms & enquiries inbox; Navigation & footer; SEO & redirects.

ADMIN
- Users & roles: roles Super admin, Sales manager, Sales agent, Marketing/content, Finance, Viewer, with a permission matrix (module × view / create / edit / delete / publish / approve).
- Approval queue: price, unit-status and content changes waiting for approval, with before/after diff and approve/reject with comment.
- Audit log: who changed what and when, before/after values, filters, export.
- Settings: company details, offices, phone/WhatsApp numbers, currencies and exchange rates (USD / AUD / AED), email/SMS/WhatsApp notification templates, integrations (Google Analytics, Meta Pixel, Matterport, payment gateway), backups.
- Notifications centre; profile & security (2FA, active sessions).

STATES for every main admin screen: loading skeleton, empty state with a first-action CTA, error state, success toast, confirm-delete dialog, unsaved-changes warning, permission-denied state.
```

## A5: Mobile for sales agents, polish and handoff

```
Final round for the OVDC Admin project:
1. Mobile (390) for sales agents: bottom tabs Home, Leads, Units, Visits, More; quick unit availability lookup by project/floor; call or WhatsApp a lead in one tap; log a visit outcome; today's visits; notifications.
2. Consistency pass: every screen uses the navy + gold tokens only (no red Modernist leftovers), shared status colours with letters everywhere, WCAG AA contrast, focus states, keyboard order, 44px touch targets on mobile, all sample data Sri Lankan and consistent across screens.
3. Handoff page: screen inventory with links, component list with variants, token tables, table/form patterns, permission matrix summary, and empty/error state catalogue.
```

---

## 3. Build recommendations (after the design)

**Stack**
- **Website: Next.js (App Router), not the current Vite SPA.** Property buyers find developers through Google search, and a Vite single-page app is weak for SEO. Home Lands uses Next.js for this reason.
- **Admin:** the same Next.js app under `/admin`, or a separate React app.
- **Backend:** Node.js + PostgreSQL + Prisma, the same stack as the existing `ovdc-backend-node-js`.
- **Auth:** the existing `ovdc-auth-backend-node-js` already has users, divisions and `integrated_systems`. Register the website admin as another integrated system for single sign-on.
- **Media:** Cloudflare R2 or S3 with a CDN; AVIF/WebP images; panoramas tiled on upload.
- **360° viewer:** Photo Sphere Viewer (virtual-tour, markers and gyroscope plugins), with a Matterport iframe fallback.
- **Building explorer:** SVG polygons over the renders, stored as JSON. No heavy 3D engine is needed.

**Sri Lanka-specific**
- WhatsApp Business API, logging every click as a lead with project and unit context.
- SMS site-visit reminders through a local gateway (Notify.lk, Dialog, Mobitel).
- PayHere or a bank IPG for reservation fees (phase 2).
- Sinhala and Tamil language support, with URLs kept in English for SEO.

**Business impact**
- Link 360° tour analytics to leads, so sales can see which units and rooms a buyer looked at.
- Gate the brochure and floor-plan PDFs behind a 3-field form.
- Show live availability from the admin, e.g. "Only 3 sea-view units left on floors 10–14".

**Content OVDC must provide:** real logo and brand guide, company stats, projects with UDA numbers, photos and drone video, 360° panoramas or renders per unit type, floor plans (preferably vector), price lists, payment plans, testimonials with permission, awards, office details.

**Phases**
1. Design: website W1–W5 and admin A1–A5. The two tracks can run in parallel.
2. MVP: Home, Projects, Project detail, Unit detail, 360° tours, forms; Admin Projects, Units, Tours, Media, Leads, Visits, Users.
3. Building explorer and mapper, calculators, compare, News, Careers, multi-currency.
4. Reservations and payments, customer portal, Sinhala/Tamil, WhatsApp automation.
