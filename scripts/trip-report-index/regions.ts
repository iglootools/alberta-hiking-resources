/**
 * The region taxonomy the generated pages are split by. How each source's own
 * vocabulary maps onto it is in sources/catalog.ts.
 *
 * The taxonomy follows how the blogs themselves file trips rather than the
 * site's weather regions or a guidebook's chapters, because that is what makes
 * the mapping near-lossless: every source already publishes a region, so
 * adopting a scheme none of them uses would mean inventing placements.
 *
 * Canmore is not split out from Kananaskis. Explor8ion — the largest and most
 * finely curated source — files the whole Bow Valley front under Kananaskis
 * Country, so separating them would put Ha Ling in a different region depending
 * on which blog reported it.
 */
export interface Region {
  readonly id: string
  readonly title: string
  readonly description: string
  /** Sidebar icon. Lucide only, and scanned out of the generated frontmatter. */
  readonly icon: string
  /**
   * The heading the region is listed under on the three index pages, verbatim;
   * the region map's legend groups by it. Absent for the catch-all page, which
   * is not a region.
   */
  readonly group?: string
}

/**
 * Emitted in this order, which is also the page order in the sidebar and the file
 * numbering of every generated page. The grouping and its order are the same ones
 * the three index pages use for their region cards, so the sidebar and the index
 * read the same way round; `group` is the index heading verbatim.
 */
export const REGIONS: readonly Region[] = [
  { group: 'Kananaskis and Canmore', id: 'kananaskis-canmore', icon: 'i-lucide-mountain-snow', title: 'Kananaskis Country and Canmore', description: 'Trip reports and GPS traces by objective for Kananaskis, the Elbow and Highwood, Smith-Dorrien, and the Canmore front ranges.' },

  { group: 'The Front Ranges and the Forestry Trunk Road', id: 'ghost-front-ranges', icon: 'i-lucide-tent-tree', title: 'The Ghost and the Front Ranges', description: 'Trip reports and GPS traces by objective for the Ghost Wilderness, Ya Ha Tinda, the Red Deer River, and the foothills.' },
  { group: 'The Front Ranges and the Forestry Trunk Road', id: 'david-thompson', icon: 'i-lucide-waves', title: 'David Thompson Country and the Bighorn', description: 'Trip reports and GPS traces by objective for Abraham Lake, Nordegg, the Siffleur, White Goat, and the Bighorn Backcountry.' },

  { group: 'The Mountain Parks', id: 'banff', icon: 'i-lucide-landmark', title: 'Banff National Park', description: 'Trip reports and GPS traces by objective for Banff, Lake Louise, Skoki, and Sunshine.' },
  { group: 'The Mountain Parks', id: 'assiniboine', icon: 'i-lucide-pyramid', title: 'Mount Assiniboine', description: 'Trip reports and GPS traces by objective for Mount Assiniboine Provincial Park and its approaches.' },
  { group: 'The Mountain Parks', id: 'yoho', icon: 'i-lucide-trees', title: 'Yoho National Park', description: 'Trip reports and GPS traces by objective for Yoho National Park, including Field and Lake O’Hara.' },
  { group: 'The Mountain Parks', id: 'kootenay', icon: 'i-lucide-leaf', title: 'Kootenay National Park', description: 'Trip reports and GPS traces by objective for Kootenay National Park, along Highway 93 South.' },
  { group: 'The Mountain Parks', id: 'icefields-parkway', icon: 'i-lucide-snowflake', title: 'Icefields Parkway and the Columbia Icefield', description: 'Trip reports and GPS traces by objective along the Icefields Parkway, the Wapta, and the Columbia Icefield.' },
  { group: 'The Mountain Parks', id: 'jasper-robson', icon: 'i-lucide-triangle', title: 'Jasper and Mount Robson', description: 'Trip reports and GPS traces by objective for Jasper National Park, Mount Robson Provincial Park, and Grande Cache and the Willmore Wilderness north of them.' },

  { group: 'The South', id: 'crowsnest-castle', icon: 'i-lucide-milestone', title: 'Crowsnest Pass and the Castle', description: 'Trip reports and GPS traces by objective for the Crowsnest Pass, the Castle, and the Livingstone and Whaleback ranges.' },
  { group: 'The South', id: 'waterton', icon: 'i-lucide-sailboat', title: 'Waterton Lakes', description: 'Trip reports and GPS traces by objective for Waterton Lakes National Park and the Akamina Parkway.' },
  { group: 'The South', id: 'glacier-montana', icon: 'i-lucide-flag', title: 'Glacier National Park, Montana', description: 'Trip reports and GPS traces by objective for Glacier National Park in Montana, just south of Waterton.' },

  { group: 'West of the Divide', id: 'bc-rockies-purcells', icon: 'i-lucide-mountain', title: 'BC Rockies and the Purcells', description: 'Trip reports and GPS traces by objective for the East Kootenay, Elk Lakes, the Height of the Rockies, and the Purcells.' },
  { group: 'West of the Divide', id: 'rogers-pass-selkirks', icon: 'i-lucide-cable-car', title: 'Rogers Pass, the Selkirks, and Golden', description: 'Trip reports and GPS traces by objective for Glacier National Park in BC, the Selkirks, and the peaks around Golden.' },

  // Weekend-trip range from Calgary rather than day-trip range. Added because
  // the Alpine Club and Hostelling International both hold properties out here
  // that otherwise had nowhere to be listed, and because one source covers them
  // properly.
  { group: 'Beyond the Rockies', id: 'sea-to-sky', icon: 'i-lucide-tram-front', title: 'Sea to Sky and the Coast Mountains', description: 'Trip reports and GPS traces by objective for Vancouver, the North Shore, Squamish, Whistler, and Pemberton.' },
  { group: 'Beyond the Rockies', id: 'fraser-valley', icon: 'i-lucide-cloud-drizzle', title: 'Fraser Valley and the Cascades', description: 'Trip reports and GPS traces by objective for Chilliwack, the Cheam Range, Manning Park, and the Coquihalla.' },
  { group: 'Beyond the Rockies', id: 'okanagan', icon: 'i-lucide-sun', title: 'Okanagan and Thompson', description: 'Trip reports and GPS traces by objective for Kamloops, Kelowna, Penticton, and the Okanagan ranges.' },
  { group: 'Beyond the Rockies', id: 'shuswap-monashees', icon: 'i-lucide-anchor', title: 'Shuswap and the Monashees', description: 'Trip reports and GPS traces by objective for Salmon Arm, Sicamous, Shuswap Lake, and the Monashee Mountains.' },
  { group: 'Beyond the Rockies', id: 'west-kootenay', icon: 'i-lucide-tree-pine', title: 'West Kootenay', description: 'Trip reports and GPS traces by objective for Nelson, the Kokanee Glacier, and the southern Selkirks.' },
  { group: 'Beyond the Rockies', id: 'vancouver-island', icon: 'i-lucide-ship', title: 'Vancouver Island', description: 'Trip reports and GPS traces by objective for Strathcona Park and the island ranges.' }
]

export const REGION_IDS: ReadonlySet<string> = new Set(REGIONS.map(region => region.id))

/**
 * Regions that share a boundary a trip can straddle: a peak on the line
 * between them, or one reached from one and standing in the other. Listed one
 * way and made symmetric below.
 *
 * It is what tells a boundary objective from two mountains with one name. Bow
 * Peak filed under Banff by one blog and the Icefields Parkway by another is
 * one peak on a boundary; Mount Bishop filed under Kananaskis and the Sea to
 * Sky is two peaks 600 km apart. Likewise an inferred region far from the
 * stated ones is evidence about a namesake — Helen Lake's position is on
 * Vancouver Island, Golden Scrambles' Mount Allen is by Canal Flats while the
 * gazetteer's is in Banff — not a boundary the objective straddles. See ADR-011.
 *
 * Drawn generously, since a missing edge splits one mountain in two: a range
 * crossing two regions counts, and so does a pass road between them.
 */
const NEIGHBOURS: Readonly<Record<string, readonly string[]>> = {
  'kananaskis-canmore': ['ghost-front-ranges', 'banff', 'assiniboine', 'bc-rockies-purcells', 'crowsnest-castle'],
  'ghost-front-ranges': ['banff', 'david-thompson'],
  'david-thompson': ['banff', 'icefields-parkway', 'jasper-robson'],
  'banff': ['assiniboine', 'yoho', 'kootenay', 'icefields-parkway'],
  'assiniboine': ['kootenay', 'bc-rockies-purcells'],
  'yoho': ['kootenay', 'icefields-parkway', 'bc-rockies-purcells', 'rogers-pass-selkirks'],
  'kootenay': ['bc-rockies-purcells'],
  'icefields-parkway': ['jasper-robson'],
  'jasper-robson': ['shuswap-monashees'],
  'crowsnest-castle': ['waterton', 'bc-rockies-purcells'],
  'waterton': ['glacier-montana', 'bc-rockies-purcells'],
  'glacier-montana': ['bc-rockies-purcells'],
  'bc-rockies-purcells': ['rogers-pass-selkirks', 'west-kootenay'],
  'rogers-pass-selkirks': ['shuswap-monashees', 'west-kootenay'],
  'sea-to-sky': ['fraser-valley', 'okanagan', 'vancouver-island'],
  'fraser-valley': ['okanagan'],
  'okanagan': ['shuswap-monashees', 'west-kootenay'],
  'shuswap-monashees': ['west-kootenay']
}

const ADJACENT: ReadonlyMap<string, ReadonlySet<string>> = new Map(REGIONS.map(({ id }) => [id, new Set([
  ...(NEIGHBOURS[id] ?? []),
  ...Object.entries(NEIGHBOURS).filter(([, neighbours]) => neighbours.includes(id)).map(([other]) => other)
])]))

/** Whether two regions are one and the same or share a boundary. */
export function areNeighbours(left: string, right: string): boolean {
  return left === right || (ADJACENT.get(left)?.has(right) ?? false)
}

/** For a test: every region named in the adjacency table, so a typo cannot hide there. */
export const NEIGHBOUR_IDS: ReadonlySet<string> = new Set(Object.entries(NEIGHBOURS).flat(2))

/**
 * The catch-all page, for objectives no source places and no curation covers.
 *
 * Deliberately **not** a member of REGIONS: it is a page, not a region. The
 * weather and accommodation sections mirror REGIONS and would otherwise be
 * required to carry a page for it, which would make no sense — there is no
 * forecast for "unsorted".
 *
 * It exists because four sources publish no region anywhere. Andrew Nugara and
 * On-Top state none in any field; their reports mention regions in prose, but
 * measured against objectives other sources place, the prose is right 45% and
 * 64% of the time respectively, so it is not read. Their links and trailheads
 * are, and place most of their objectives as inferred (see inference.ts);
 * what is left here had no such evidence, or evidence too mixed to act on.
 */
export const UNSORTED: Region = {
  id: 'unsorted',
  icon: 'i-lucide-circle-help',
  title: 'Not yet sorted by region',
  description: 'Objectives whose region no blog states and nothing else settles, published here rather than filed on a guess.'
}

/**
 * Sentinel for a source region that is deliberately out of scope — Explor8ion's
 * canoe trips in Manitoba and Ontario, Steven Song's international and coastal
 * BC peaks. A report filed under it drops its objective unless another source
 * states a region we cover (see build.ts).
 *
 * It is not the same as a label missing from the map, which fails nothing: the
 * report is read as stating no region, and its objective is placed by the
 * other sources or by inference, or lands on the catch-all page. Mapping a
 * label to this sentinel is what keeps a foreign objective off that page.
 */
export const OUT_OF_SCOPE = 'out-of-scope'
