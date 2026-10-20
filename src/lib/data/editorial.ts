import type { PhotoKey } from "./media";

/** News & blog. Sample articles in OVDC's voice — replace with real posts (admin: Content → News). */
export interface Article {
  slug: string;
  title: string;
  dek: string;
  category: "Construction" | "Buying guide" | "Lifestyle" | "Company";
  date: string; // ISO
  minutes: number;
  photo: PhotoKey;
  body: { h?: string; p: string }[];
}

export const articles: Article[] = [
  {
    slug: "ocean-view-residences-17th-floor",
    title: "Ocean View Residences tops out its 17th floor",
    dek: "Tower A is now two-thirds of the way up, and the façade mock-up has been signed off.",
    category: "Construction",
    date: "2026-10-12",
    minutes: 3,
    photo: "site1",
    body: [
      { p: "On 12 October the site team poured the 17th-floor slab of Tower A, keeping Ocean View Residences on programme for handover in December 2027. Tower B has reached level 12." },
      { h: "Façade and glazing", p: "The full-size façade mock-up was approved by the architect and the client representative in September. Low-E double-glazed units for the sea-facing elevations are now in production, with the first deliveries due in January." },
      { h: "What happens next", p: "Over the next quarter, mechanical and electrical works move up from the 8th floor, the podium pool shell is water-tested, and the show-apartment finishes are repeated in the first completed homes." },
      { p: "Buyers can follow every stage on the construction progress page, which is updated with new photographs on the first working day of each month." },
    ],
  },
  {
    slug: "buying-an-apartment-in-sri-lanka-from-abroad",
    title: "Buying an apartment in Sri Lanka from abroad: a step-by-step guide",
    dek: "From the reservation fee to the deed, what Sri Lankans overseas and foreign buyers need to know.",
    category: "Buying guide",
    date: "2026-09-28",
    minutes: 6,
    photo: "keys",
    body: [
      { p: "Around a third of our buyers live outside Sri Lanka. Most never visit until handover: they choose a home through the 360° tour and a video call, sign through a power of attorney and pay in foreign currency." },
      { h: "1. Reserve", p: "A refundable reservation fee holds the unit for 14 days while you review the sale agreement. It is adjusted against your first instalment." },
      { h: "2. Sign", p: "You can sign the sale agreement at a Sri Lankan embassy or high commission, or appoint a trusted person in Sri Lanka through a power of attorney." },
      { h: "3. Pay", p: "Foreign-currency payments are made through an Inward Investment Account (IIA) at a licensed commercial bank. Keep the bank’s encashment certificates: they let you repatriate proceeds if you sell later." },
      { h: "4. Take the keys", p: "At handover we walk the home with you or your representative, record any snags and fix them within the defects-liability period." },
      { p: "Every situation is different, so please take independent legal advice before you sign." },
    ],
  },
  {
    slug: "what-a-construction-linked-payment-plan-means",
    title: "What a construction-linked payment plan means for you",
    dek: "Why you pay as we build, and how instalments are certified.",
    category: "Buying guide",
    date: "2026-09-10",
    minutes: 4,
    photo: "plans",
    body: [
      { p: "With a construction-linked plan, you pay 20% when you sign and the rest in instalments tied to stages of construction — the substructure, slabs at set floors, the roof, the façade, finishes and handover." },
      { h: "Who decides a stage is complete?", p: "Each stage is certified by the project architect before we issue the invoice, and the certificate is shared with every buyer. Nothing is due before the work is done." },
      { h: "Using a housing loan", p: "Our partner banks release loan funds against the same certificates, so your own contribution and the bank’s disbursements line up with the build." },
    ],
  },
  {
    slug: "inside-the-type-c-show-apartment",
    title: "Inside the Type C show apartment",
    dek: "Three bedrooms, a study and a 240 sqft terrace: a walk through the most requested layout.",
    category: "Lifestyle",
    date: "2026-08-22",
    minutes: 3,
    photo: "livingSea",
    body: [
      { p: "Type C is the layout most of our buyers ask to see first. At 1,980 sqft, it puts the living and dining room on the sea side, with the master suite and terrace alongside." },
      { h: "Light and air", p: "Floor-to-ceiling glazing on the west façade and cross-ventilation through the kitchen keep the home bright and cool through the afternoon." },
      { p: "You can walk through it room by room in the 360° tour, or book a visit to see the finishes in person." },
    ],
  },
  {
    slug: "landscaping-the-podium-gardens",
    title: "Landscaping the podium gardens",
    dek: "Native planting, a koi pond and shaded walks that stay cool in the afternoon.",
    category: "Lifestyle",
    date: "2026-07-30",
    minutes: 3,
    photo: "koiPond",
    body: [
      { p: "Our landscape architects chose native and coastal species that cope with salt air and need little irrigation. Rainwater harvested from the roofs supplies the gardens through the dry months." },
      { p: "The koi pond sits beside the residents’ lounge, with seating in the shade of mature trees transplanted from the site before construction began." },
    ],
  },
  {
    slug: "ovdc-introduces-live-building-explorer",
    title: "OVDC introduces a live building explorer",
    dek: "See which homes are available, floor by floor, updated the moment a unit is reserved.",
    category: "Company",
    date: "2026-06-18",
    minutes: 2,
    photo: "towerDusk",
    body: [
      { p: "Buyers can now pick a floor of Ocean View Residences on our website and see which homes are available, reserved or sold, with prices and plans for each." },
      { p: "The explorer reads from the same inventory our sales team uses, so availability is always current. It joins the 360° tours launched last year." },
    ],
  },
];

export interface Role {
  slug: string;
  title: string;
  team: string;
  location: string;
  type: string;
  summary: string;
  duties: string[];
  needs: string[];
}

/** Sample open roles — replace with real vacancies (admin: Careers). */
export const roles: Role[] = [
  {
    slug: "senior-site-engineer",
    title: "Senior Site Engineer",
    team: "Projects",
    location: "Mount Lavinia site",
    type: "Full-time",
    summary: "Lead the structural and finishing works on Tower B of Ocean View Residences.",
    duties: ["Plan and supervise daily site work with subcontractors", "Check work against drawings and specifications", "Keep the programme, quality and safety records up to date"],
    needs: ["BSc in Civil Engineering, CEng or working towards it", "7+ years on high-rise residential projects", "Strong on site safety and quality control"],
  },
  {
    slug: "sales-advisor-overseas-buyers",
    title: "Sales Advisor, Overseas Buyers",
    team: "Sales",
    location: "Colombo 03 (hybrid)",
    type: "Full-time",
    summary: "Guide buyers in Australia, the Gulf and the UK from first video call to handover.",
    duties: ["Run live video tours across time zones", "Explain payment plans, IIA payments and documentation", "Keep every enquiry up to date in the CRM"],
    needs: ["3+ years in property or financial sales", "Excellent spoken and written English; Sinhala or Tamil a plus", "Comfortable working some evenings and weekends"],
  },
  {
    slug: "architectural-designer",
    title: "Architectural Designer",
    team: "Design",
    location: "Colombo 03",
    type: "Full-time",
    summary: "Develop layouts, interiors and 3D visualisations for upcoming launches.",
    duties: ["Develop unit layouts and finishes schedules", "Produce renders and 360° panoramas for sales", "Coordinate with consultants and the site team"],
    needs: ["Degree in Architecture (SLIA Part 2 or equivalent)", "Revit plus a real-time renderer such as D5, Lumion or Enscape", "A portfolio of residential work"],
  },
  {
    slug: "digital-marketing-executive",
    title: "Digital Marketing Executive",
    team: "Marketing",
    location: "Colombo 03",
    type: "Full-time",
    summary: "Run paid social and search campaigns and keep the website content fresh.",
    duties: ["Plan and run Meta and Google campaigns", "Publish news, progress updates and listings", "Report on leads, cost per lead and site-visit conversion"],
    needs: ["2+ years in performance marketing", "Hands-on with Meta Ads Manager and Google Ads", "Clear writer with an eye for photography"],
  },
];

/** Site-wide FAQ, grouped. */
export const faqGroups: { group: string; items: { q: string; a: string }[] }[] = [
  {
    group: "Buying",
    items: [
      { q: "How do I reserve a home?", a: "Choose a unit with a sales advisor or in the building explorer, then pay the reservation fee of LKR 500,000. It holds the unit for 14 days while you review the sale agreement, and is adjusted against your booking payment." },
      { q: "What is included in the price?", a: "The apartment with the finishes listed in the specification, your allocated parking, and a share of the common areas. Furniture, appliances beyond those specified, and air-conditioning units are not included unless stated." },
      { q: "Are there other costs?", a: "Allow for stamp duty and legal fees on the deed, a one-off sinking-fund contribution at handover and the monthly management fee. Your lawyer will confirm the exact amounts." },
      { q: "Can I change the layout or finishes?", a: "Minor changes are possible before the relevant construction stage, at cost and subject to approval. Ask your advisor early." },
    ],
  },
  {
    group: "Payments & loans",
    items: [
      { q: "How does the payment plan work?", a: "20% when you sign, then instalments tied to certified construction stages, and the balance at handover. See the payment plan on each project page." },
      { q: "Can I get a housing loan?", a: "Yes. Partner banks typically lend up to 70% of the price for under-construction homes and release funds against the same stage certificates. Use the loan calculator for an estimate." },
      { q: "Can I pay in foreign currency?", a: "Yes, through an Inward Investment Account (IIA) at a licensed commercial bank. Keep the encashment certificates for future repatriation." },
    ],
  },
  {
    group: "Overseas buyers",
    items: [
      { q: "Can foreigners buy an apartment?", a: "Foreign nationals can generally buy condominium apartments, subject to Sri Lankan law (including the floor on which the unit is located) and payment through an IIA. Please take independent legal advice." },
      { q: "Do I need to be in Sri Lanka to buy?", a: "No. Many buyers sign at an embassy or through a power of attorney and choose their home through the 360° tour and a live video walk-through." },
    ],
  },
  {
    group: "Construction & handover",
    items: [
      { q: "How do I follow progress?", a: "We publish photographs and a percentage-complete figure for every tower on the first working day of each month." },
      { q: "What warranty do I get?", a: "A one-year defects-liability period on finishes and a ten-year structural warranty, written into the sale agreement." },
      { q: "When do I get the deed?", a: "After completion the condominium plan is registered with the Condominium Management Authority; individual deeds follow, typically within six months." },
    ],
  },
];

/** Awards: to be supplied by OVDC. Placeholders keep the layout honest until then. */
export const awards = [
  { year: "2025", title: "[Award title]", by: "[Awarding body]" },
  { year: "2025", title: "[Award title]", by: "[Awarding body]" },
  { year: "2024", title: "[Award title]", by: "[Awarding body]" },
  { year: "2023", title: "[Award title]", by: "[Awarding body]" },
];

export const certifications = [
  { mark: "UDA", title: "Urban Development Authority approval", body: "Every project carries its UDA approval number, listed on its page." },
  { mark: "CMA", title: "Condominium Management Authority", body: "Condominium plans are registered with the CMA on completion." },
  { mark: "CIDA", title: "Construction Industry Development Authority", body: "[Grading to be confirmed by OVDC]" },
  { mark: "ISO", title: "Quality management", body: "[Certificate details to be confirmed by OVDC]" },
];
