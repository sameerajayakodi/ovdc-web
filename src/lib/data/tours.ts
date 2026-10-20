import type { Tour } from "../types";

/**
 * Panoramas: CC0 interiors from Poly Haven (polyhaven.com), resized to
 * 4096 × 2048 in public/tours/<tour-id>/. Replace with OVDC's own 360° renders
 * or show-apartment captures using the same file names.
 */
const pano = (tour: string, scene: string) => ({
  panorama: `/tours/${tour}/${scene}.jpg`,
  thumb: `/tours/${tour}/${scene}-thumb.jpg`,
});

export const tours: Tour[] = [
  {
    id: "ovr-type-c",
    projectSlug: "ocean-view-residences",
    projectName: "Ocean View Residences",
    projectLoc: "Mount Lavinia",
    unitRef: "A-14B",
    title: "Three-bedroom sea-view residence",
    typeLabel: "Type C",
    floorLabel: "Floor 14",
    interior: 1980,
    terrace: 240,
    bedrooms: "3 + study",
    bathrooms: "3.5",
    price: 94.2,
    pricePerSqft: 47600,
    parking: "2 parking bays",
    status: "A",
    panorama: "/tours/ovr-type-c/living.jpg",
    planRooms: [
      { id: "living", x: 0, y: 0, w: 110, h: 115, label: "LIVING · DINING" },
      { id: "kitchen", x: 110, y: 0, w: 90, h: 45, label: "KITCHEN · DINING" },
      { id: "bath", x: 110, y: 45, w: 90, h: 30, label: "BATH" },
      { id: "master", x: 110, y: 75, w: 90, h: 65, label: "MASTER" },
      { id: "balcony", x: 0, y: 115, w: 110, h: 25, label: "TERRACE", outdoor: true },
    ],
    scenes: [
      {
        id: "living", name: "Living Room", short: "Living", note: "3.2 m ceilings · open-plan living and dining",
        plan: [55, 57], rot: 0, yaw: 0, pos: "50% 50%", ...pano("ovr-type-c", "living"),
        hs: [
          { t: "nav", to: "kitchen", yaw: 35, pitch: -10 },
          { t: "nav", to: "master", yaw: 95, pitch: -8 },
          { t: "nav", to: "balcony", yaw: 190, pitch: -12 },
          { t: "info", id: "floor", yaw: -25, pitch: -38, kicker: "Flooring", title: "Engineered oak flooring", body: "Wide-plank engineered oak across living and dining, laid over underfloor acoustic insulation." },
          { t: "info", id: "ceiling", yaw: 150, pitch: 38, kicker: "Ceiling", title: "Feature timber ceiling", body: "Exposed timber beams with concealed LED coves over a 3.2 m high living room." },
        ],
      },
      {
        id: "kitchen", name: "Kitchen & Dining", short: "Kitchen", note: "Open-plan kitchen with a breakfast counter",
        plan: [155, 22], rot: 0, yaw: 0, pos: "50% 50%", ...pano("ovr-type-c", "kitchen"),
        hs: [
          { t: "nav", to: "living", yaw: 210, pitch: -10 },
          { t: "nav", to: "bath", yaw: 120, pitch: -8 },
          { t: "info", id: "island", yaw: 20, pitch: -30, kicker: "Kitchen", title: "Breakfast counter", body: "Quartz-topped counter with seating for four, open to the dining area." },
          { t: "info", id: "appliances", yaw: 70, pitch: -5, kicker: "Appliances", title: "Integrated appliances", body: "Induction hob, built-in oven and dishwasher, panel-fronted to match the joinery." },
        ],
      },
      {
        id: "master", name: "Master Bedroom", short: "Master", note: "Sea-facing suite with doors to the terrace",
        plan: [155, 107], rot: 0, yaw: 0, pos: "50% 50%", ...pano("ovr-type-c", "master"),
        hs: [
          { t: "nav", to: "living", yaw: 260, pitch: -10 },
          { t: "nav", to: "bath", yaw: 340, pitch: -8 },
          { t: "info", id: "doors", yaw: 40, pitch: -4, kicker: "Glazing", title: "Full-height sliding doors", body: "Low-E double glazing opening onto the terrace, with the sea beyond." },
        ],
      },
      {
        id: "bath", name: "Bathroom", short: "Bath", note: "Master en-suite · rain shower and soaking tub",
        plan: [155, 60], rot: 0, yaw: 0, pos: "50% 50%", ...pano("ovr-type-c", "bath"),
        hs: [
          { t: "nav", to: "master", yaw: 200, pitch: -10 },
          { t: "nav", to: "kitchen", yaw: 110, pitch: -10 },
          { t: "info", id: "tub", yaw: 150, pitch: -12, kicker: "Fixtures", title: "Soaking tub under a skylight", body: "Freestanding tub, walk-in rain shower and wall-hung fittings in a naturally lit en-suite." },
        ],
      },
      {
        id: "balcony", name: "Terrace", short: "Terrace", note: "West-facing · 240 sqft covered terrace",
        plan: [55, 127], rot: 0, yaw: 0, pos: "50% 50%", ...pano("ovr-type-c", "balcony"),
        hs: [
          { t: "nav", to: "living", yaw: 40, pitch: -12 },
          { t: "info", id: "terrace", yaw: 230, pitch: 4, kicker: "Outdoor living", title: "Covered terrace", body: "A covered terrace with a built-in barbecue, deep enough for a dining table for six." },
        ],
      },
    ],
  },
];
