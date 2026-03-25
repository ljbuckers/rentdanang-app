export interface AreaBoundary {
  name: string;
  slug: string;
  color: string;
  center: [number, number]; // [lng, lat]
  polygon: [number, number][]; // array of [lng, lat] — first & last point must match
}

/**
 * Connected area boundary polygons for Da Nang.
 *
 * Adjacent areas share exact boundary points so there are no visible gaps:
 *   - Lien Chieu east ↔ Hai Chau west (4 shared points)
 *   - Hai Chau east ↔ An Thuong west (2 shared points on river)
 *   - Hai Chau SE ↔ Ngu Hanh Son west (4 shared points)
 *   - Son Tra south ↔ An Thuong north (3 shared points)
 *   - An Thuong south ↔ Ngu Hanh Son north (2 shared points on split line)
 *
 * Hai Chau includes the Thanh Khe and Cam Le districts which are not
 * major expat areas but fill the gaps between Lien Chieu and the river.
 *
 * An Thuong / My An is a sub-area of Ngu Hanh Son district, split at
 * approximately latitude 16.037.
 *
 * All coordinates are [longitude, latitude] (Mapbox order).
 */
export const AREA_BOUNDARIES: AreaBoundary[] = [
  {
    name: "An Thuong / My An",
    slug: "an-thuong",
    color: "#0077B6",
    center: [108.2432, 16.0466],
    polygon: [
      [108.2359971, 16.0340552], // SW — split line west (shared: Hai Chau, Ngu Hanh Son)
      [108.2322896, 16.0514213], // NW — river junction (shared: Son Tra, Hai Chau)
      [108.2367957, 16.0534755], // N — mid (shared: Son Tra)
      [108.2487502, 16.0538435], // NE — near coast (shared: Son Tra)
      [108.2504477, 16.0484834], // E — coast south
      [108.2525199, 16.0425640], // E — coast
      [108.2548517, 16.0366750], // SE — split line east (shared: Ngu Hanh Son)
      [108.2359971, 16.0340552], // close
    ],
  },
  {
    name: "Son Tra",
    slug: "son-tra",
    color: "#FF6B6B",
    center: [108.28, 16.105],
    // Full peninsula + east bank. South boundary shared with An Thuong.
    polygon: [
      [108.2090274, 16.1224989],
      [108.2184548, 16.1157404],
      [108.2189688, 16.1191836],
      [108.2285792, 16.1167616],
      [108.2352511, 16.1123205],
      [108.2417872, 16.1121590],
      [108.2421676, 16.1038720],
      [108.2381439, 16.0960114],
      [108.2344715, 16.1026015],
      [108.2285751, 16.1012456],
      [108.2240146, 16.1077542],
      // South boundary — shared with An Thuong (reversed)
      [108.2322896, 16.0514213], // An Thuong NW (shared: An Thuong, Hai Chau)
      [108.2367957, 16.0534755], // An Thuong N mid (shared: An Thuong)
      [108.2487502, 16.0538435], // An Thuong NE (shared: An Thuong)
      // Coastline going north-east
      [108.2469101, 16.0682168],
      [108.2494039, 16.0866143],
      [108.2552387, 16.0988415],
      [108.2645123, 16.1009162],
      [108.2678400, 16.0958973],
      [108.2706427, 16.0981337],
      [108.2783581, 16.0976865],
      [108.2814895, 16.0987596],
      [108.2921202, 16.1055951],
      [108.3005689, 16.0997775],
      [108.3102889, 16.0996789],
      [108.3161331, 16.1127621],
      // North coast
      [108.3311122, 16.1173479],
      [108.3380879, 16.1202486],
      [108.3251562, 16.1386242],
      [108.3192623, 16.1434627],
      [108.3123158, 16.1407154],
      [108.3105308, 16.1252743],
      [108.2981911, 16.1272743],
      [108.2825101, 16.1374449],
      [108.2736535, 16.1338237],
      [108.2685087, 16.1402527],
      [108.2610287, 16.1496435],
      [108.2467402, 16.1551019],
      [108.2372384, 16.1489305],
      [108.2312758, 16.1467939],
      [108.2293581, 16.1388672],
      [108.2245061, 16.1343475],
      [108.2209887, 16.1245237],
      [108.2090274, 16.1224989], // close
    ],
  },
  {
    name: "Hai Chau (Downtown)",
    slug: "hai-chau",
    color: "#10B981",
    center: [108.2208, 16.0678],
    // Greater Downtown — includes Hai Chau, Thanh Khe, and Cam Le districts.
    // West boundary shared with Lien Chieu, east on the Han River,
    // SE boundary shared with Ngu Hanh Son.
    polygon: [
      // NW — shared with Lien Chieu point 17
      [108.1531691, 16.0903771],
      // North edge going east
      [108.1770000, 16.0850000],
      [108.2071278, 16.0984265],
      // NE — Han River north
      [108.2179270, 16.0999948],
      // East — Han River going south
      [108.2246135, 16.0878672],
      [108.2267343, 16.0686543],
      // River / An Thuong NW junction (shared: Son Tra, An Thuong)
      [108.2322896, 16.0514213],
      // An Thuong SW / Ngu Hanh Son NW junction (shared: An Thuong, Ngu Hanh Son)
      [108.2359971, 16.0340552],
      // SE — Ngu Hanh Son west boundary going south (shared: Ngu Hanh Son)
      [108.2324671, 16.0090261],
      [108.2294794, 15.9925574],
      [108.2227105, 15.9799469],
      [108.2168322, 15.9710357],
      // South — Cam Le south going west
      [108.2099825, 15.9727559],
      [108.1984482, 16.0023316],
      [108.1857057, 15.9944837],
      [108.1576860, 15.9970320],
      // SW — going north to Lien Chieu
      [108.1587777, 16.0033102],
      // West — shared with Lien Chieu going north (points 14→15→16→17)
      [108.1603360, 16.0349249],
      [108.1709438, 16.0504497],
      [108.1697479, 16.0696475],
      [108.1531691, 16.0903771], // close
    ],
  },
  {
    name: "Ngu Hanh Son (Marble Mountains)",
    slug: "ngu-hanh-son",
    color: "#F59E0B",
    center: [108.255, 16.005],
    // Southern district (Marble Mountains area).
    // North boundary is the split line shared with An Thuong.
    // West boundary shared with Hai Chau.
    polygon: [
      [108.2548517, 16.0366750], // NE — split line east (shared: An Thuong)
      [108.2359971, 16.0340552], // NW — split line west (shared: An Thuong, Hai Chau)
      // West boundary going south (shared: Hai Chau)
      [108.2324671, 16.0090261],
      [108.2294794, 15.9925574],
      [108.2227105, 15.9799469],
      [108.2168322, 15.9710357],
      // South coast
      [108.2173865, 15.9687395],
      [108.2187974, 15.9658007],
      [108.2200513, 15.9638237],
      [108.2233332, 15.9622001],
      [108.2246161, 15.9607797],
      [108.2249066, 15.9582734],
      [108.2306327, 15.9578141],
      [108.2321528, 15.9626346],
      [108.2386082, 15.9648427],
      [108.2412073, 15.9677347],
      [108.2437956, 15.9700917],
      [108.2462249, 15.9716431],
      [108.2480577, 15.9714764],
      [108.2532290, 15.9729475],
      [108.2593419, 15.9702009],
      [108.2649153, 15.9653597],
      [108.2685094, 15.9634258],
      [108.2692391, 15.9622136],
      [108.2717711, 15.9600861],
      // SE corner — coast heading north
      [108.2869049, 15.9718197],
      [108.2830981, 15.9783472],
      [108.2805346, 15.9831514],
      [108.2776343, 15.9888316],
      [108.2743544, 15.9952251],
      [108.2712187, 16.0013840],
      [108.2676371, 16.0089631],
      [108.2650424, 16.0146635],
      [108.2628938, 16.0194041],
      [108.2605145, 16.0239741],
      [108.2589857, 16.0275357],
      [108.2569919, 16.0317275],
      [108.2548517, 16.0366750], // close
    ],
  },
  {
    name: "Lien Chieu (North)",
    slug: "lien-chieu",
    color: "#8B5CF6",
    center: [108.15, 16.09],
    // Northwest district. East boundary shared with Hai Chau (points 14→17).
    polygon: [
      [108.0869883, 16.1388548],
      [108.0959657, 16.1300482],
      [108.0949759, 16.1057408],
      [108.1141079, 16.1131654],
      [108.1181124, 16.1051844],
      [108.1129025, 16.0821933],
      [108.1255317, 16.0669754],
      [108.1343749, 16.0615730],
      [108.1311891, 16.0523152],
      [108.1302561, 16.0465504],
      [108.1370745, 16.0398311],
      [108.1441004, 16.0342623],
      [108.1484860, 16.0353296],
      [108.1549260, 16.0349326],
      [108.1603360, 16.0349249], // pt 14 — shared with Hai Chau
      [108.1709438, 16.0504497], // pt 15 — shared with Hai Chau
      [108.1697479, 16.0696475], // pt 16 — shared with Hai Chau
      [108.1531691, 16.0903771], // pt 17 — shared with Hai Chau
      [108.1375619, 16.1053613],
      [108.1303477, 16.1192059],
      [108.1232448, 16.1343148],
      [108.1362124, 16.1407200],
      [108.1368954, 16.1590683],
      [108.1537947, 16.1645612],
      [108.1530850, 16.1769057],
      [108.1637913, 16.1936295],
      [108.1843282, 16.1993276],
      [108.1867890, 16.2078488],
      [108.1745767, 16.2040221],
      [108.1671890, 16.2038174],
      [108.1558633, 16.2021996],
      [108.1474215, 16.1996851],
      [108.1378142, 16.1931888],
      [108.1190950, 16.1811254],
      [108.1095217, 16.1838451],
      [108.1010286, 16.1866599],
      [108.0930549, 16.1787045],
      [108.0942839, 16.1674494],
      [108.0948941, 16.1638647],
      [108.0946641, 16.1542012],
      [108.0930769, 16.1459994],
      [108.0869883, 16.1388548], // close
    ],
  },
];
