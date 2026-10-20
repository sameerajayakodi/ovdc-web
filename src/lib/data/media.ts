/**
 * Stock photography until OVDC's own shoot is ready.
 *
 * Every photo is from Unsplash under the Unsplash License (free for commercial
 * use, no permission needed; credit appreciated — see /credits). Replace an
 * entry's `src` with a local file in /public/images to swap in real OVDC photos.
 */

export interface Photo {
  src: string;
  alt: string;
  by?: string;
  user?: string;
  /** width / height */
  ar: number;
}

const u = (id: string, alt: string, by: string, user: string, ar: number): Photo => ({
  src: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80`,
  alt,
  by,
  user,
  ar,
});

export const photos = {
  // hero & coast
  heroPool: u("1757924330358-a48d65664dac", "Infinity pool facing the sea at sunset, framed by palms", "Aalo Lens", "aalolens", 1.78),
  oceanSunset: u("1743592322246-38d5a2e971bd", "Sunset over the Indian Ocean with the Colombo coastline in the distance", "Zoshua Colah", "zoshuacolah", 1.33),
  oceanDusk: u("1762489597574-6e3190656259", "Dramatic sunset over the ocean", "Aimy Aishwara", "kiarokat", 1.79),
  mountLavinia: u("1743521714536-c45ef812db7d", "Mount Lavinia beach with palms and seafront buildings", "Zoshua Colah", "zoshuacolah", 1.4),
  mountLaviniaTall: u("1743521715397-bed8ffd33859", "Beachfront building at Mount Lavinia under a blue sky", "Zoshua Colah", "zoshuacolah", 0.75),
  colomboDay: u("1740812517101-fee71e001ebc", "Colombo skyline with the Lotus Tower", "Zoshua Colah", "zoshuacolah", 1.6),
  colomboDusk: u("1546656495-fc838de15e5c", "Aerial view of Colombo at dusk with the Lotus Tower", "Christoph Theisinger", "chippenpuepp", 1.5),
  colomboGolden: u("1791530431321-d41c19cccfd6", "Aerial view of the Colombo skyline at golden hour with the Indian Ocean", "Thilina Alagiyawanna", "thilinaalagiyawanna", 0.67),
  colomboRail: u("1623595289196-007a22dd8560", "Railway line leading to the Lotus Tower in Colombo at golden hour", "Tharoushan Kandarajah", "tharoushan", 0.67),
  colomboLake: u("1561426802-392f5b6290cf", "The Lotus Tower above Beira Lake, Colombo", "Jalitha Hewage", "kenhewage", 0.75),
  kandyHills: u("1609681980718-340e7f4b11d7", "Waterfall in the green hills of central Sri Lanka", "Thushal Madhushankha", "thushal98", 0.93),

  // buildings
  towerBeach: u("1771190252113-aa988822596f", "Residential tower beside the beach and palm trees", "Sergio Martins", "smartins20", 1.5),
  towerPalms: u("1772860812099-30373d1f3045", "Seafront apartment building behind palm trees", "cool guy jon", "cool_guy_jon", 1.5),
  towerCurved: u("1767055114909-1170503862f1", "Tower with curved balconies against a cloudy sky", "Jonathan Lim", "jonathankslim", 0.67),
  towerDusk: u("1768913573640-f3e66eeb2168", "High-rise residence with lit windows at dusk", "You Le", "le_y0u", 0.67),
  towerBrown: u("1557868969-df9517e8df10", "Residential tower with deep balconies", "Jonas Hoss", "jonashoss", 0.66),
  twinTowers: u("1783801419756-7d549c3eb277", "Twin residential towers against a clear sky", "bahareh moradian", "bahar_mr", 1.5),
  gardenBlock: u("1608459966584-009357d89cbd", "Apartment building among mature trees", "Andrea Ferrario", "andreaferrario", 0.8),
  lowRise: u("1512915922686-57c11dde9b6b", "Low-rise residences with planted terraces", "Frames For Your Heart", "framesforyourheart", 1.5),
  townhouses: u("1778375744848-e7757f0254e6", "Modern white townhouses with black accents on a slope", "何青蓝", "heqinglan0602_tianya", 0.75),
  villaTwilight: u("1759372945658-1e9f56e751bd", "Tropical villa with a pool at twilight", "kadek wahyudi", "hellobalikadek19_", 1),
  villaDay: u("1596178067639-5c6e68aea6dc", "Villa beside a pool in tropical gardens", "The Anam", "theanamcxr", 1.5),

  // amenities
  poolDay: u("1550504969-937eb02c18b3", "Pool deck on a sunny day", "Toomas Tartes", "toomastartes", 1.58),
  gym: u("1758957646695-ec8bce3df462", "Gym with treadmills and full-height windows", "Aalo Lens", "aalolens", 1.78),
  gymWarm: u("1630703178161-1e2f9beddbf8", "Residents’ gym with natural light", "Point3D Commercial Imaging Ltd.", "3dottawa", 1.5),
  library: u("1634705964493-63ad88dc7464", "Residents’ library lounge", "Timur Kozmenko", "timrael", 1.5),
  lounge: u("1720540244592-b4124532b318", "Lounge with a checkered floor and tall windows", "Angelina Kusznirewicz", "angelina_k", 0.7),
  lobby: u("1758193783649-13371d7fb8dd", "Lobby with reception desk and seating", "Aalo Lens", "aalolens", 1.67),
  koiPond: u("1789959927352-feef798e1f77", "Lily pond in a tropical garden", "Ahmet Yüksek", "ahmetyuksek", 1.5),
  gardenPond: u("1783246949479-c2b129ea8aa3", "Garden pond with giant lily pads and palms", "Z LH", "jameszlh", 1.5),
  playground: u("1729147947344-865151ce9abf", "Children’s play area with slides", "Emanuel Haas", "dermanuskript", 1.5),

  // interiors
  livingSea: u("1779903726785-7cf25bed78f7", "Dining area overlooking the beach and ocean", "Caroline Badran", "___atmos", 1.5),
  diningSea: u("1776761603930-e4509e386fbf", "Table set by a window with an ocean view", "Antonio Araujo", "antonioaaaraujo", 1.5),
  bedroomSea: u("1779870458288-95fd59cd2c5b", "Bright bedroom with a sea view", "Sang Ho", "hovansang18", 1.5),
  living: u("1757924461488-ef9ad0670978", "Living room with large windows", "Aalo Lens", "aalolens", 1.5),
  livingCity: u("1632743441209-8a09b8a37e25", "Living room with a large window", "Robbie Duncan", "duncanphotographygroup", 1.5),
  kitchen: u("1760072513457-651955c7074d", "Kitchen with island and dining area", "Obegi Home", "obegihome", 1.5),
  kitchenWhite: u("1560185127-1902ccdc5094", "White and grey kitchen", "Francesca Tosolini", "fromitaly", 1.5),
  kitchenCompact: u("1715985160053-d339e8b6eb94", "Fitted kitchen", "Gerda Kauks", "gdisain", 1.5),
  bedroom: u("1638454668466-e8dbd5462f20", "Bedroom with a desk by the window", "Lotus Design N Print", "lotusdnp", 1.5),
  bathroom: u("1717497043540-d45bf85e5d38", "Bathroom with a freestanding tub and plant", "Vije Vijendranath", "vijev", 1.5),
  bathTub: u("1631215750638-bdde5f616128", "Freestanding bathtub and shower", "mk. s", "mk__s", 1.04),
  balconySea: u("1610394001485-a3eceff6a4d8", "Balcony looking over the sea", "Flow Clark", "flowclark", 0.66),
  balconyOcean: u("1702830499141-a0634d87d6af", "Balcony with an ocean view", "David Kuvaev", "dkuva", 0.75),

  // craft, trust, process
  marble: u("1694378061058-bb6532de3bba", "Close-up of white marble", "Akbar Nemati", "akbarnemati", 1.5),
  keys: u("1733244766159-f58f4184fd38", "Hand holding the keys to a new home", "Jakub Żerdzicki", "jakubzerdzicki", 1.5),
  solar: u("1745187946672-2c1d8cf26a2b", "Solar panels on a rooftop", "Rafael Moreno", "rafamrn", 1.78),
  drafting: u("1503387837-b154d5074bd2", "Architect drafting on a blueprint", "Daniel McCullough", "d_mccullough", 1.78),
  plans: u("1542621334-a254cf47733d", "Pencil on architectural drawings", "Sven Mieke", "sxoxm", 1.5),

  // construction
  site1: u("1706437524158-6ca925ce5a06", "Tower under construction with cranes", "taro ohtani", "taro_ohtani", 1.5),
  site2: u("1622649396178-b56dfd532226", "Crane beside a rising concrete frame", "Billy Freeman", "billyfreeman", 1.57),
  site3: u("1709714398528-eb8b8df26732", "Concrete frame with a tower crane", "Mister Paps", "themisterpaps", 0.67),
  site4: u("1764258777856-723351e71a17", "Tower crane on an unfinished building", "Juan Pablo", "who0ne", 0.67),
  site5: u("1700469919563-ef267d459da5", "High-rise structure with a crane", "Musa Dhlamini", "eagle_eye_1", 1.5),
  site6: u("1601074231509-dce351c05199", "Building frame and yellow crane", "Ryunosuke Kikuno", "ryunosuke_kikuno", 0.67),
  site7: u("1655975719898-8f3432eed322", "Crane lifting materials on site", "Adesh Bankar", "adesh_bankar", 1.5),
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof photos;

/** Cover photo per project slug. */
export const projectPhoto: Record<string, PhotoKey> = {
  "ocean-view-residences": "towerBeach",
  "the-marine-crest": "towerCurved",
  "lagoon-terraces": "townhouses",
  "kandy-hill-villas": "villaTwilight",
  "battaramulla-park": "twinTowers",
  "ward-place-residences": "towerBrown",
  "rajagiriya-gardens": "gardenBlock",
};

/** Five-photo gallery per project (main + four). */
export const projectGallery: Record<string, PhotoKey[]> = {
  "ocean-view-residences": ["towerBeach", "heroPool", "livingSea", "lobby", "balconySea"],
  "the-marine-crest": ["towerCurved", "oceanDusk", "living", "gym", "bedroomSea"],
  "lagoon-terraces": ["townhouses", "gardenPond", "kitchen", "bedroom", "poolDay"],
  "kandy-hill-villas": ["villaTwilight", "kandyHills", "villaDay", "bathroom", "koiPond"],
  "battaramulla-park": ["twinTowers", "gardenPond", "livingCity", "gymWarm", "playground"],
  "ward-place-residences": ["towerBrown", "colomboDay", "kitchenWhite", "library", "bedroom"],
  "rajagiriya-gardens": ["gardenBlock", "koiPond", "livingCity", "kitchenCompact", "playground"],
};

/** Interior photo per unit layout. */
export const typePhoto: Record<string, PhotoKey> = {
  "Type A": "livingCity",
  "Type B": "living",
  "Type C": "livingSea",
  "Type D": "diningSea",
};

/** Site photos for monthly progress updates (newest first). */
export const progressPhotos: PhotoKey[] = ["site1", "site2", "site5", "site7", "site3", "site6"];

/** Unsplash `src` sized for a given width (Next/Image also resizes; this keeps the source request small). */
export function sized(p: Photo, w: number) {
  return `${p.src}&w=${w}`;
}
