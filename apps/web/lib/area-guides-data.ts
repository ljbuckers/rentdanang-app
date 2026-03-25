export interface AreaGuide {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  vibe: string;
  bestFor: string[];
  pros: string[];
  cons: string[];
  rentRanges: {
    studio: string;
    oneBr: string;
    twoBr: string;
    luxury?: string;
  };
  ratings: {
    walkability: number;
    nightlife: number;
    englishFriendly: number;
    beachAccess: number;
    localFood: number;
  };
  highlights: {
    name: string;
    description: string;
    icon: string;
  }[];
  nearbyBeaches: {
    name: string;
    distance: string;
  }[];
  coworking: {
    name: string;
    price?: string;
  }[];
  restaurants: string[];
  groceries: string[];
  center: {
    lat: number;
    lng: number;
  };
}

export const AREA_GUIDES: AreaGuide[] = [
  {
    slug: "an-thuong-my-an",
    name: "An Thuong / My An",
    tagline: "The Expat Hub",
    description:
      "An Thuong is Da Nang's unofficial digital nomad headquarters. Packed with WiFi cafes, yoga studios, Western restaurants, and a 5-minute walk to My An Beach, it's the easiest place in the city to land, connect, and get settled. If you want a social launch pad with all the creature comforts, start here.",
    vibe:
      "Digital nomad central. Canggu vibes but cheaper. Morning yoga, laptop cafes, sunset beach beers.",
    bestFor: [
      "First-timers",
      "Digital nomads",
      "Short stays 1-3 months",
      "Social people",
    ],
    pros: [
      "5 min walk to My An Beach",
      "Most English spoken in Da Nang",
      "Dozens of WiFi cafes",
      "Easy to meet expats within days",
      "Western food everywhere",
      "Yoga, pilates, and CrossFit studios",
      "Grab drivers know the area",
    ],
    cons: [
      "Tourist pricing 20-40% more",
      "Can feel like a bubble",
      "Constant construction noise",
      "Smaller apartments for the price",
      "Limited Vietnamese immersion",
      "Peak season crowded",
    ],
    rentRanges: {
      studio: "$250-400",
      oneBr: "$350-550",
      twoBr: "$450-750",
      luxury: "$800-1200",
    },
    ratings: {
      walkability: 5,
      nightlife: 4,
      englishFriendly: 5,
      beachAccess: 5,
      localFood: 3,
    },
    highlights: [
      {
        name: "My An Beach",
        description:
          "Stunning sunset views, Paradise Beach Bar with outdoor cinema screenings.",
        icon: "beach",
      },
      {
        name: "An Thuong Walking Street",
        description: "Weekend night market with food, drinks, and live music.",
        icon: "moon",
      },
      {
        name: "Cafe Culture",
        description:
          "43 Factory Coffee, Cong Ca Phe, and dozens more laptop-friendly spots.",
        icon: "coffee",
      },
      {
        name: "Seaview Coworking",
        description:
          "$75/mo coworking space with ocean views and a solid community.",
        icon: "laptop",
      },
    ],
    nearbyBeaches: [
      { name: "My An Beach", distance: "5 min walk" },
      { name: "Bac My An Beach", distance: "10 min walk" },
      { name: "My Khe Beach", distance: "15 min bike" },
    ],
    coworking: [
      { name: "Seaview Coworking", price: "$75/mo" },
      { name: "Enouvo Space", price: "$60-80/mo" },
      { name: "ACE Coworking", price: "$50-70/mo" },
    ],
    restaurants: ["Waterfront", "Pizza 4P's", "Madam Lan", "Bread of Life"],
    groceries: ["MOONMILK", "An Hai Dong Market", "Circle K", "GS25"],
    center: { lat: 16.0466, lng: 108.2432 },
  },
  {
    slug: "son-tra",
    name: "Son Tra",
    tagline: "The Quiet Beach Life",
    description:
      "Son Tra is where long-term expats settle once they've done the An Thuong circuit. Rents drop 30-40% for the same quality, apartments are bigger, views are better, and the neighborhood feels authentically Vietnamese. You'll trade nightlife and English menus for Monkey Mountain hikes, quiet beaches, and knowing your fruit vendor by name.",
    vibe:
      "Residential calm. Morning coastal runs, local pho, afternoon by the pool. Know the fruit vendor by name in a week.",
    bestFor: [
      "Long-term stays 6+ months",
      "Couples and families",
      "Space and quiet seekers",
      "Nature lovers",
    ],
    pros: [
      "30-40% cheaper than An Thuong for same quality",
      "Bigger apartments with better views",
      "Authentic Vietnamese neighborhood feel",
      "Monkey Mountain hiking trails",
      "Quieter, less crowded beaches",
      "Growing restaurant scene",
      "Less construction noise",
    ],
    cons: [
      "Fewer Western restaurants",
      "Less English spoken",
      "Further from hospitals and malls",
      "Fewer coworking options",
      "Can feel isolated without a motorbike",
      "Limited nightlife",
    ],
    rentRanges: {
      studio: "$180-300",
      oneBr: "$280-450",
      twoBr: "$350-600",
      luxury: "$700-1500 (villas)",
    },
    ratings: {
      walkability: 3,
      nightlife: 2,
      englishFriendly: 2,
      beachAccess: 4,
      localFood: 5,
    },
    highlights: [
      {
        name: "Lady Buddha",
        description:
          "67-meter statue at Linh Ung Pagoda. Free entry with stunning sunrise views over the coast.",
        icon: "temple",
      },
      {
        name: "Son Tra Peninsula Hikes",
        description:
          "Home to the rare red-shanked douc langurs. Multiple trails through dense jungle.",
        icon: "monkey",
      },
      {
        name: "Tien Sa Beach",
        description:
          "Secluded beach with a dramatic mountain backdrop, far from the tourist crowds.",
        icon: "beach",
      },
      {
        name: "Local Seafood",
        description:
          "Fresh catches at fishing village prices. Some of the best and cheapest seafood in the city.",
        icon: "seafood",
      },
    ],
    nearbyBeaches: [
      { name: "Man Thai Beach", distance: "Local favorite" },
      { name: "Tien Sa Beach", distance: "On the peninsula" },
      { name: "My Khe North", distance: "10 min ride" },
    ],
    coworking: [
      {
        name: "Limited options - work from home or cafes",
      },
    ],
    restaurants: [
      "Be Man Seafood",
      "Local pho spots",
      "Bun bo Hue street stalls",
    ],
    groceries: ["Vinmart+", "Local wet markets", "Circle K"],
    center: { lat: 16.1, lng: 108.25 },
  },
  {
    slug: "hai-chau",
    name: "Hai Chau",
    tagline: "City Side",
    description:
      "Hai Chau is the real Da Nang — the downtown core where locals live, work, and eat. The trade-off is simple: no beach nearby, more noise, and almost no English, but you get the cheapest central rents in the city, the best street food scene, and total immersion in Vietnamese daily life. The Dragon Bridge fire show on weekends is a bonus.",
    vibe:
      "Real Vietnamese city life. Street food stalls, motorbike traffic, karaoke bars. Less polished but way more authentic.",
    bestFor: [
      "Authenticity over beach access",
      "Budget-conscious long-termers",
      "Vietnamese language learners",
      "Working with Vietnamese companies",
    ],
    pros: [
      "Cheapest central rents (studios from $150)",
      "Best local food scene in Da Nang",
      "Lotte Mart, GO!, and hospitals all walkable",
      "Dragon Bridge fire show Sat/Sun 9pm",
      "Han River boardwalk for evening strolls",
      "Most opportunities to practice Vietnamese",
      "Central to everything in the city",
    ],
    cons: [
      "No beach (15-20 min ride to coast)",
      "More traffic and noise",
      "Very little English spoken",
      "Fewer expat social opportunities",
      "Older building stock",
      "Can feel overwhelming for newcomers",
    ],
    rentRanges: {
      studio: "$150-250",
      oneBr: "$200-350",
      twoBr: "$300-500",
    },
    ratings: {
      walkability: 4,
      nightlife: 3,
      englishFriendly: 1,
      beachAccess: 1,
      localFood: 5,
    },
    highlights: [
      {
        name: "Dragon Bridge",
        description:
          "Iconic bridge that breathes fire and water every Saturday and Sunday at 9pm.",
        icon: "dragon",
      },
      {
        name: "Han Market",
        description:
          "Central market for souvenirs, local food, and bargaining practice.",
        icon: "shopping",
      },
      {
        name: "Lotte Mart / GO!",
        description:
          "Large supermarkets with imported food, household goods, and air-conditioned relief.",
        icon: "cart",
      },
      {
        name: "Bach Dang Street",
        description:
          "Riverside promenade lined with food stalls and views of the illuminated bridges at night.",
        icon: "city",
      },
    ],
    nearbyBeaches: [
      { name: "My Khe Beach", distance: "15 min motorbike" },
      { name: "Pham Van Dong beach road", distance: "20 min motorbike" },
    ],
    coworking: [
      { name: "IoT Coworking", price: "$40-60/mo" },
      { name: "Toong" },
      { name: "Various Bach Dang cafes" },
    ],
    restaurants: [
      "Bun cha ca street stalls",
      "Mi Quang restaurants",
      "Banh xeo shops",
      "Night market food vendors",
    ],
    groceries: ["Lotte Mart", "GO!", "Mega Market", "Han Market"],
    center: { lat: 16.0678, lng: 108.2208 },
  },
  {
    slug: "ngu-hanh-son",
    name: "Ngu Hanh Son",
    tagline: "Marble Mountains Side",
    description:
      "Ngu Hanh Son sits on the quieter southern stretch of coast, anchored by Non Nuoc Beach and the Marble Mountains. It appeals to surfers, families, and anyone who wants resort-quality living without the An Thuong price tag or crowd. The area is also a natural halfway point between Da Nang and Hoi An.",
    vibe:
      "Quiet luxury meets surf culture. Resort pools morning, surf lessons afternoon, Marble Mountains sunset hike.",
    bestFor: [
      "Surfers (Sep-Mar season)",
      "Families wanting quiet beach life",
      "Resort-style living",
      "Splitting time between Da Nang and Hoi An",
    ],
    pros: [
      "Non Nuoc Beach is less crowded and has surfing",
      "Marble Mountains in your backyard",
      "Resort facilities often included in rent",
      "Halfway to Hoi An (20 min ride)",
      "Newer, modern buildings",
      "Quieter than An Thuong",
      "Growing cafe scene",
    ],
    cons: [
      "More isolated with fewer walkable amenities",
      "Resort area can feel sterile",
      "Further from hospitals and shopping",
      "Limited restaurant options vs An Thuong or Hai Chau",
      "Need a motorbike to get around",
      "Fewer expats overall",
    ],
    rentRanges: {
      studio: "$200-350",
      oneBr: "$300-500",
      twoBr: "$400-650",
      luxury: "$800-1500 (resort condos)",
    },
    ratings: {
      walkability: 2,
      nightlife: 1,
      englishFriendly: 3,
      beachAccess: 5,
      localFood: 3,
    },
    highlights: [
      {
        name: "Marble Mountains",
        description:
          "Five limestone hills with pagodas, caves, and panoramic views. 40,000 VND entrance fee.",
        icon: "mountain",
      },
      {
        name: "Non Nuoc Beach",
        description:
          "Surf season runs Sep-Mar. T20 surf school offers lessons and board rental.",
        icon: "surf",
      },
      {
        name: "Non Nuoc Stone Village",
        description:
          "Traditional marble carving artisan village at the base of the mountains.",
        icon: "stone",
      },
      {
        name: "Hoi An Access",
        description:
          "Ancient town is just a 20-minute ride south along the coastal road.",
        icon: "lantern",
      },
    ],
    nearbyBeaches: [
      { name: "Non Nuoc Beach", distance: "Surfing beach" },
      { name: "An Bang Beach", distance: "25 min (Hoi An side)" },
      { name: "My An South", distance: "10 min ride" },
    ],
    coworking: [
      { name: "Limited - resort cafes nearby" },
      { name: "An Thuong coworking spaces", price: "15 min ride" },
    ],
    restaurants: [
      "La Maison 1888",
      "Beach restaurants",
      "Local seafood near Marble Mountains",
    ],
    groceries: [
      "Vinmart+",
      "Local markets",
      "Lotte Mart (20 min ride)",
    ],
    center: { lat: 16.02, lng: 108.25 },
  },
  {
    slug: "lien-chieu",
    name: "Lien Chieu",
    tagline: "The Local Northwest",
    description:
      "Lien Chieu is the furthest from the expat trail and the cheapest district in Da Nang. It is a mix of university life, local industry, and traditional neighborhoods. If your goal is total Vietnamese immersion, maximum budget savings, or proximity to the Hai Van Pass, this is the district that delivers all three.",
    vibe:
      "University town meets industrial growth. Morning markets, afternoon naps, evening banh mi. Zero pretense.",
    bestFor: [
      "Budget stays 6+ months",
      "Vietnamese language students",
      "University students or researchers",
      "Avoiding the expat bubble entirely",
    ],
    pros: [
      "Cheapest rents in Da Nang (studios from $100-120)",
      "Total immersion and fastest Vietnamese language learning",
      "Authentic local daily life",
      "Near Hai Van Pass scenic rides",
      "Nam O fishing village with snorkeling",
      "University area with young locals",
      "Growing infrastructure",
    ],
    cons: [
      "Far from expat infrastructure (30+ min ride)",
      "Almost zero English spoken",
      "Limited Western food options",
      "No walkable beach",
      "Older housing stock",
      "Can feel lonely without Vietnamese language skills",
      "Limited nightlife",
    ],
    rentRanges: {
      studio: "$100-180",
      oneBr: "$150-280",
      twoBr: "$200-400",
    },
    ratings: {
      walkability: 3,
      nightlife: 1,
      englishFriendly: 1,
      beachAccess: 2,
      localFood: 5,
    },
    highlights: [
      {
        name: "Hai Van Pass",
        description:
          "One of Vietnam's most scenic coastal roads. 20 minutes to the top by motorbike.",
        icon: "road",
      },
      {
        name: "Nam O Village",
        description:
          "Traditional fishing village with snorkeling spots and boat trips.",
        icon: "boat",
      },
      {
        name: "Da Nang University Area",
        description:
          "Cheap student food courts and young local crowd for language exchange.",
        icon: "university",
      },
      {
        name: "Local Markets",
        description:
          "Freshest produce in the city at rock-bottom prices. Daily morning markets.",
        icon: "vegetable",
      },
    ],
    nearbyBeaches: [
      { name: "Nam O Beach", distance: "15 min ride" },
      { name: "Xuan Thieu Beach", distance: "Nearby" },
      { name: "Lang Co Beach", distance: "Over Hai Van Pass, 40 min" },
    ],
    coworking: [
      {
        name: "None - work from home or local cafes",
      },
    ],
    restaurants: [
      "University food stalls",
      "Local pho shops",
      "Com tam restaurants",
      "Nam O seafood village",
    ],
    groceries: [
      "Local wet markets (cheapest in Da Nang)",
      "Vinmart+",
      "Family-run shops",
    ],
    center: { lat: 16.09, lng: 108.15 },
  },
];

export function getAreaGuide(slug: string): AreaGuide | undefined {
  return AREA_GUIDES.find((area) => area.slug === slug);
}

// Map slug aliases: MapView uses short slugs, area-guides use longer slugs
const MAP_SLUG_TO_GUIDE_SLUG: Record<string, string> = {
  "an-thuong": "an-thuong-my-an",
  "son-tra": "son-tra",
  "hai-chau": "hai-chau",
  "ngu-hanh-son": "ngu-hanh-son",
  "lien-chieu": "lien-chieu",
};

export function getAreaGuideByMapSlug(mapSlug: string): AreaGuide | undefined {
  const guideSlug = MAP_SLUG_TO_GUIDE_SLUG[mapSlug] ?? mapSlug;
  return AREA_GUIDES.find((area) => area.slug === guideSlug);
}
