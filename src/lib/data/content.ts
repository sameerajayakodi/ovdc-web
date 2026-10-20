import type { NearbyPlace, PaymentStage, ProgressUpdate } from "../types";

export const company = {
  name: "Ocean View Development Company (Pvt) Ltd",
  short: "OVDC",
  hotline: "+94 11 234 5678",
  hotlineHref: "tel:+94112345678",
  whatsapp: "+94 77 123 4567",
  whatsappHref: "https://wa.me/94771234567",
  email: "sales@ovdc.lk",
  web: "ovdc.lk",
  address: ["No. 42, Marine Drive", "Colombo 03, Sri Lanka"],
  hours: "Mon–Sat 9.00 am – 6.00 pm · Sun 10.00 am – 4.00 pm",
  reg: "PV 00123456",
  lat: 6.8935,
  lng: 79.8535,
};

export const offices = [
  {
    city: "Colombo",
    label: "Head office & sales gallery",
    lines: ["No. 42, Marine Drive", "Colombo 03, Sri Lanka"],
    phone: "+94 11 234 5678",
    email: "sales@ovdc.lk",
    hours: "Mon–Sat 9.00 am – 6.00 pm · Sun 10.00 am – 4.00 pm",
    lat: 6.8935,
    lng: 79.8535,
  },
  {
    city: "Mount Lavinia",
    label: "Ocean View Residences site office",
    lines: ["Galle Road, Mount Lavinia", "Show apartment open daily"],
    phone: "+94 11 234 5679",
    email: "oceanview@ovdc.lk",
    hours: "Daily 9.00 am – 6.00 pm",
    lat: 6.839,
    lng: 79.865,
  },
];

/** Home stats band. [Replace with OVDC's audited figures.] */
export const stats = [
  { to: 28, suffix: "+", label: "Years of experience" },
  { to: 1450, suffix: "", label: "Homes delivered" },
  { to: 36, suffix: "", label: "Developments" },
  { to: 4200, suffix: "+", label: "Happy clients" },
  { to: 18, suffix: "", label: "Awards" },
];

export const why = [
  {
    id: "excellence",
    title: "Excellence",
    ph: "Craftsmanship detail",
    body: "Every finish is specified, sampled and signed off by our in-house design team. We build a show apartment before we sell, so what you see is what you get.",
    points: [
      { v: "28", l: "Years building in Sri Lanka" },
      { v: "100%", l: "Projects with show units" },
    ],
  },
  {
    id: "trust",
    title: "Trust",
    ph: "Handover moment",
    body: "UDA-approved plans, clear title and fixed handover dates written into every sale agreement. We have never missed a handover by more than a quarter.",
    points: [
      { v: "1,450", l: "Homes handed over" },
      { v: "10 yr", l: "Structural warranty" },
    ],
  },
  {
    id: "innovation",
    title: "Innovation",
    ph: "Solar roof or smart-home panel",
    body: "Solar-ready roofs, rainwater harvesting and smart-home wiring as standard, with 360° tours and a live building explorer so overseas buyers can choose with confidence.",
    points: [
      { v: "40%", l: "Lower common-area energy use" },
      { v: "360°", l: "Tours for every new launch" },
    ],
  },
];

export const homeAmenities = [
  { id: "pool", title: "Infinity-edge pool", body: "25m lap pool on level 5, facing the sunset." },
  { id: "gym", title: "Sky gym & yoga deck", body: "Technogym floor and an open-air deck above the sea." },
  { id: "lounge", title: "Residents’ lounge", body: "Double-height lounge with a library and co-working nook." },
  { id: "garden", title: "Landscaped gardens", body: "Native planting, shaded walks and a koi pond." },
  { id: "kids", title: "Children’s play deck", body: "Soft-floor play area beside the splash pool." },
  { id: "concierge", title: "24/7 concierge & security", body: "Staffed lobby, CCTV and key-card lifts." },
];

export const testimonials = [
  {
    id: "fernando",
    quote: "We moved in on the date in our contract. Two years on, the building is still looked after like the day we arrived.",
    name: "Ruwan & Shanika Fernando",
    role: "Homeowners, Rajagiriya Gardens",
  },
  {
    id: "wick",
    quote: "I bought from Melbourne using the 360° tour and video calls. Seeing it in person for the first time, nothing was different.",
    name: "Dr. Nadeesha Wickramasinghe",
    role: "Homeowner, Ward Place Residences",
  },
];

export const AMENITY_ICONS: Record<string, string> = {
  water: "M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M6 10V4a2 2 0 0 1 4 0M14 10V4a2 2 0 0 1 4 0",
  fitness: "M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12",
  leisure: "M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0zM4 18v2M20 18v2",
  family: "M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  green: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10zM2 21c0-3 1.85-5.36 5.08-6",
  services: "M6 18h12M12 4v2M4 18a8 8 0 0 1 16 0M2 21h20",
  security: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  building: "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
};

export const amenityGroups: { icon: string; name: string; items: string[] }[] = [
  { icon: "water", name: "Pool & spa", items: ["25m infinity pool", "Kids’ splash pool", "Jacuzzi", "Pool-deck cabanas", "Sauna", "Steam room"] },
  { icon: "fitness", name: "Fitness", items: ["Sky gym", "Yoga deck", "Squash court", "Jogging track", "Spin studio", "Outdoor fitness"] },
  { icon: "leisure", name: "Leisure", items: ["Residents’ lounge", "Library", "Games room", "Mini cinema", "Rooftop BBQ terrace", "Sunset deck", "Party hall", "Private dining room"] },
  { icon: "family", name: "Family", items: ["Children’s play deck", "Crèche", "Teen room", "Pet park"] },
  { icon: "green", name: "Gardens", items: ["Landscaped gardens", "Koi pond", "Herb garden", "Shaded walks", "Rooftop garden", "Sea-view sundeck"] },
  { icon: "services", name: "Services", items: ["24/7 concierge", "Housekeeping on call", "Laundry service", "Co-working lounge", "Meeting rooms", "Parcel room"] },
  { icon: "security", name: "Security", items: ["24/7 security", "CCTV coverage", "Key-card lifts", "Video intercom", "Fire detection & sprinklers"] },
  { icon: "building", name: "Building", items: ["100% backup generator", "EV charging", "Two parking bays (3 & 4 Bed)", "Visitor parking", "Six high-speed lifts", "Rainwater harvesting", "Solar-ready roof", "Piped LP gas"] },
];

export const specs: { title: string; items: string[] }[] = [
  { title: "Structure", items: ["Reinforced-concrete frame, Grade 40 concrete, designed to BS 8110 / Eurocode 2", "Wind and seismic loads checked by an independent structural engineer", "Pile foundations to bedrock, 10-year structural warranty"] },
  { title: "Floor finishes", items: ["Living and dining: 1200 × 600 mm imported porcelain", "Bedrooms: engineered oak", "Balconies: anti-slip porcelain with concealed drainage"] },
  { title: "Bathroom", items: ["Grohe or equivalent fittings, rain shower in master bath", "Wall-hung WCs with concealed cisterns", "Full-height porcelain wall tiles, frameless glass screens"] },
  { title: "Pantry", items: ["Quartz countertops and splashback", "Soft-close cabinetry with integrated handles", "Induction hob, hood, built-in oven (Type C and D)"] },
  { title: "Electrical", items: ["Three-phase supply with individual CEB meter", "Provision for AC in all bedrooms and living", "Smart-home ready: data points, video intercom, lighting control"] },
  { title: "Doors & windows", items: ["Powder-coated aluminium, low-E double glazing on sea façades", "Solid-core timber entrance door with digital lock", "2.4m flush internal doors"] },
  { title: "Waterproofing", items: ["Crystalline waterproofing to basement and podium", "Membrane to all wet areas and balconies, flood-tested", "Roof: inverted insulated membrane with 10-year warranty"] },
  { title: "Termite treatment", items: ["Pre-construction soil treatment under all slabs", "Post-construction perimeter treatment", "10-year termite warranty from a licensed contractor"] },
];

export const projectFaq: { q: string; a: string }[] = [
  { q: "Can foreign nationals and Sri Lankans abroad buy here?", a: "Yes. Foreign nationals can buy condominium apartments, paying through an Inward Investment Account (IIA). Sri Lankans abroad can also pay in foreign currency. Our legal team guides you through the documents and power of attorney if you can’t be here in person." },
  { q: "How much is the reservation fee?", a: "LKR 500,000, adjusted against the 20% booking payment. If you cancel within 14 days, it is refunded less a documentation fee." },
  { q: "Can I get a housing loan?", a: "Our partner banks lend up to 70% of the purchase price for under-construction units, with instalments released by construction stage. Use the loan calculator for an estimate." },
  { q: "When will I get the deed?", a: "Handover is planned for December 2027. The condominium plan is registered with the Condominium Management Authority after completion, and individual deeds follow, typically within six months." },
  { q: "What will the maintenance fee be?", a: "Estimated at LKR 45 per sqft per month, plus a one-off sinking-fund contribution at handover. The management corporation sets the final rate." },
  { q: "Is the project approved?", a: "Yes. Ocean View Residences is approved by the Urban Development Authority under approval number UDA/DC/2023/0412, with fire and environmental clearances." },
];

export const paymentPlan: PaymentStage[] = [
  { stage: "Booking & sale agreement", pct: 20, when: "Within 14 days" },
  { stage: "Substructure complete", pct: 10, when: "Completed" },
  { stage: "8th floor slab", pct: 10, when: "Completed" },
  { stage: "16th floor slab", pct: 10, when: "Oct 2026" },
  { stage: "Roof slab", pct: 10, when: "Est. Mar 2027" },
  { stage: "Façade & glazing", pct: 10, when: "Est. Jun 2027" },
  { stage: "Finishing works", pct: 10, when: "Est. Sep 2027" },
  { stage: "Handover", pct: 20, when: "Dec 2027" },
];

export const progress: ProgressUpdate[] = [
  { month: "Oct 2026", pct: 62, a: 68, b: 54, note: "17th floor slab poured in Tower A. Tower B at level 12." },
  { month: "Sep 2026", pct: 58, a: 64, b: 50, note: "Façade mock-up approved. Glazing order placed." },
  { month: "Aug 2026", pct: 54, a: 59, b: 47, note: "Pool deck waterproofing complete on the podium." },
  { month: "Jul 2026", pct: 50, a: 55, b: 43, note: "8th floor slab handed over to MEP contractors." },
  { month: "Jun 2026", pct: 46, a: 50, b: 40, note: "Tower B core reaches level 10." },
  { month: "May 2026", pct: 41, a: 45, b: 36, note: "Basement car park slab complete." },
];

export const nearby: NearbyPlace[] = [
  { cat: "Lifestyle", name: "Mount Lavinia Beach", min: 2, mode: "walk", lat: 6.837, lng: 79.8612 },
  { cat: "Transport", name: "Mount Lavinia Railway Station", min: 5, mode: "walk", lat: 6.8327, lng: 79.8644 },
  { cat: "Schools", name: "S. Thomas’ College", min: 4, mode: "drive", lat: 6.8402, lng: 79.8668 },
  { cat: "Hospitals", name: "Colombo South Teaching Hospital", min: 9, mode: "drive", lat: 6.8668, lng: 79.8768 },
  { cat: "Lifestyle", name: "Dehiwala Zoo", min: 8, mode: "drive", lat: 6.8566, lng: 79.8742 },
  { cat: "Malls", name: "Majestic City, Colombo 04", min: 18, mode: "drive", lat: 6.8936, lng: 79.8553 },
  { cat: "Business", name: "Colombo Fort", min: 30, mode: "drive", lat: 6.9344, lng: 79.8428 },
  { cat: "Transport", name: "Bandaranaike International Airport", min: 60, mode: "drive", lat: 7.1808, lng: 79.8841 },
];

export const featuredUnits = [
  { projectSlug: "ocean-view-residences", unitRef: "A-14B" },
  { projectSlug: "ocean-view-residences", unitRef: "A-14C" },
  { projectSlug: "ocean-view-residences", unitRef: "A-21F" },
  { projectSlug: "ocean-view-residences", unitRef: "B-9D" },
];

export const milestones = [
  { year: "1998", title: "OVDC founded", body: "First residential project, twelve garden apartments in Dehiwala." },
  { year: "2006", title: "First high-rise", body: "Marine View Towers, 14 floors, handed over three months early." },
  { year: "2014", title: "1,000th home", body: "Handed over across Colombo, Negombo and Kandy." },
  { year: "2021", title: "Rajagiriya Gardens", body: "120 apartments, sold out before topping-out." },
  { year: "2023", title: "Ward Place Residences", body: "Eighteen floors in Colombo 07, our first fully smart-wired tower." },
  { year: "2026", title: "Ocean View Residences", body: "Two sea-facing towers with live 360° tours and a building explorer." },
];

export const leadership = [
  { id: "chair", name: "[Chairman name]", role: "Chairman" },
  { id: "md", name: "[Managing Director name]", role: "Managing Director" },
  { id: "cfo", name: "[Director, Finance name]", role: "Director, Finance" },
  { id: "dp", name: "[Director, Projects name]", role: "Director, Projects" },
];
