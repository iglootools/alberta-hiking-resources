/**
 * The region taxonomy the generated pages are split by, and the mapping from
 * each source's own vocabulary onto it.
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
import type { RawReport } from './types.ts'

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
  { group: 'The Mountain Parks', id: 'jasper-robson', icon: 'i-lucide-triangle', title: 'Jasper and Mount Robson', description: 'Trip reports and GPS traces by objective for Jasper National Park and Mount Robson Provincial Park.' },

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
 * BC peaks. Distinguished from "unrecognised" so that a source adding a region
 * we have never seen still fails loudly.
 */
export const OUT_OF_SCOPE = 'out-of-scope'

/**
 * Blogs by how much their region is trusted, most first. An objective is listed
 * under every region a blog states, so this no longer picks a winner; it orders
 * the claims on the page, and picks the peak that keeps a homonym's unfiled
 * reports. Explor8ion leads because its regions are hand-curated per trip; Steep
 * Sheep is absent because it publishes none at all.
 */
export const REGION_PRIORITY: readonly string[] = [
  'explor8ion',
  'spirko',
  'annie',
  'goldenscrambles',
  'stevensong',
  'virtualhiker'
]

/**
 * Entries for a source that resolves its own free-text locality to a region id
 * (see areas.ts), so its map is the identity plus the `elsewhere` marker those
 * matchers emit for somewhere this site does not cover. Built from REGIONS, so
 * adding a region needs no edit here.
 */
const SELF_RESOLVED: Readonly<Record<string, string>> = {
  ...Object.fromEntries(REGIONS.map(region => [region.id, region.id])),
  elsewhere: OUT_OF_SCOPE
}

/** Per-source region vocabulary, mapped onto REGIONS or OUT_OF_SCOPE. */
export const REGION_MAP: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  explor8ion: {
    'kananaskis-country': 'kananaskis-canmore',
    'banff-national-park': 'banff',
    'assiniboine-provincial-park': 'assiniboine',
    'yoho-national-park': 'yoho',
    'kootenay-national-park': 'kootenay',
    'columbia-icefield': 'icefields-parkway',
    'wapta-icefield': 'icefields-parkway',
    'hooker-icefield': 'icefields-parkway',
    'david-thompson-country': 'david-thompson',
    'siffleur-wilderness-area': 'david-thompson',
    'white-goat-wilderness-area': 'david-thompson',
    'job-cline-pluz': 'david-thompson',
    'bighorn-backcountry': 'david-thompson',
    'jasper-national-park': 'jasper-robson',
    'robson-provincial-park': 'jasper-robson',
    'crowsnest-pass': 'crowsnest-castle',
    'castle-wilderness': 'crowsnest-castle',
    'waterton-lakes-national-park': 'waterton',
    'ghost-wilderness-area': 'ghost-front-ranges',
    'ya-ha-tinda-ranch-area': 'ghost-front-ranges',
    'red-deer-river': 'ghost-front-ranges',
    'rocky-mountain-foothills': 'ghost-front-ranges',
    'don-getty-wildland': 'ghost-front-ranges',
    'eagle-snowshoe-conservation-reserve': 'ghost-front-ranges',
    'east-kootenay': 'bc-rockies-purcells',
    'elk-lakes-provincial-park': 'bc-rockies-purcells',
    'height-of-the-rockies-provincial-park': 'bc-rockies-purcells',
    'okanagan': OUT_OF_SCOPE,
    'atikaki-provincial-park': OUT_OF_SCOPE,
    'churchill-river': OUT_OF_SCOPE,
    'quetico-provincial-park': OUT_OF_SCOPE,
    'woodland-caribou-provincial-park': OUT_OF_SCOPE
  },

  // Bob Spirko's region is the first meaningful path segment. "NugaraScrambles"
  // is a guidebook grouping spanning four regions, not a region, so it is left
  // unmapped on purpose and those objectives inherit a region from another
  // source instead of being filed wrongly.
  spirko: {
    // Reports whose path names no region fall back to the locality line in
    // their own header, which resolves to a region id directly.
    ...SELF_RESOLVED,

    Kananaskis: 'kananaskis-canmore',
    KananaskisNorth: 'kananaskis-canmore',
    KananaskisSouth: 'kananaskis-canmore',
    Elbow: 'kananaskis-canmore',
    Highwood: 'kananaskis-canmore',
    HighwoodJunction: 'kananaskis-canmore',
    SmithDorrien: 'kananaskis-canmore',
    Canmore: 'kananaskis-canmore',
    UpperCanyon: 'kananaskis-canmore',
    CatCreekRidge: 'kananaskis-canmore',
    Banff: 'banff',
    LakeLouise: 'banff',
    Skoki: 'banff',
    Field: 'yoho',
    Icefields: 'icefields-parkway',
    JasperIcefields: 'icefields-parkway',
    Jasper: 'jasper-robson',
    DavidThompson: 'david-thompson',
    Crowsnest: 'crowsnest-castle',
    Castle: 'crowsnest-castle',
    Whaleback: 'crowsnest-castle',
    Waterton: 'waterton',
    Ghost: 'ghost-front-ranges',
    WendellArea: 'ghost-front-ranges',
    CoyoteHills: 'ghost-front-ranges',
    PorcupineHills: 'ghost-front-ranges',
    BraggCreek: 'ghost-front-ranges',
    HikingParks: OUT_OF_SCOPE,
    Lookouts: OUT_OF_SCOPE,
    // Bob Spirko's "BC" folder mixes Kootenay National Park with peaks as far
    // north as Smithers. It is mapped at low confidence: any source above it in
    // REGION_PRIORITY overrides, which is how Kootenay NP objectives land right.
    BC: 'bc-rockies-purcells',
    // US trips are filed by state. Only Montana is in scope, for Glacier.
    Montana: 'glacier-montana',
    Nevada: OUT_OF_SCOPE,
    California: OUT_OF_SCOPE,
    Arizona: OUT_OF_SCOPE,
    Utah: OUT_OF_SCOPE,
    Colorado: OUT_OF_SCOPE,
    Idaho: OUT_OF_SCOPE,
    Wyoming: OUT_OF_SCOPE,
    NewYork: OUT_OF_SCOPE
  },

  goldenscrambles: {
    'golden': 'rogers-pass-selkirks',
    'bnp': 'banff',
    'llskoki': 'banff',
    'ynp': 'yoho',
    'icefieldswapta': 'icefields-parkway',
    'icefieldscolumbia': 'david-thompson',
    'kcountryn': 'kananaskis-canmore',
    'kcountryc': 'kananaskis-canmore',
    'kcountrys': 'kananaskis-canmore',
    'smithspray': 'kananaskis-canmore',
    'radium': 'bc-rockies-purcells',
    'canal': 'bc-rockies-purcells',
    'skook': 'bc-rockies-purcells',

    // Summits the image map does not list carry an `area:` field on their own
    // page, which the adapter resolves through the shared matcher in areas.ts.
    // Only what that does not recognise needs an entry, and all of it is the
    // Cariboo, the North Thompson, or northern BC — near enough to appear, far
    // enough from anything this site covers. Its Monashee areas (Craigellachie,
    // Three Valley Gap, Malakwa, Keefer Lake) used to be listed here too, and
    // now resolve to their own region.
    ...SELF_RESOLVED,
    'area:Clinton,BC': OUT_OF_SCOPE,
    'area:Clearwater,BC': OUT_OF_SCOPE,
    'area:Hope,BC': OUT_OF_SCOPE,
    'area:Stone Mountain Provincial Park,BC': OUT_OF_SCOPE
  },

  stevensong: {
    'kananaskis': 'kananaskis-canmore',
    'banff': 'banff',
    'icefield-parkway': 'icefields-parkway',
    'david-thompson': 'david-thompson',
    'jasper': 'jasper-robson',
    'south-rockies': 'crowsnest-castle',
    'bc-rockies': 'bc-rockies-purcells',
    'selkirk-mountains': 'rogers-pass-selkirks',
    'purcell-mountains': 'bc-rockies-purcells',
    'sea-to-sky': 'sea-to-sky',
    'pemberton-onwards': 'sea-to-sky',
    'north-shore-mountains': 'sea-to-sky',
    'sunshine-coast': 'sea-to-sky',
    'fraser-valley': 'fraser-valley',
    'bc-cascades': 'fraser-valley',
    'okanagan': 'okanagan',
    'vancouver-island': 'vancouver-island',
    'monashee-mountains': 'shuswap-monashees',
    'cariboo-mountains': OUT_OF_SCOPE,
    'bc-central-coast': OUT_OF_SCOPE,
    'montana': 'glacier-montana',
    'the-north': OUT_OF_SCOPE,
    'canadian-rockies-11000ers': OUT_OF_SCOPE
  },

  /**
   * Annie Ouellet names her area in free text rather than from a fixed
   * vocabulary ("Yoho National Park", "Kiska/Wilson Public Land Use", "Yaha
   * Tinda Ranch"), so her adapter resolves it to a region id by keyword and
   * this map is the identity. It is built from REGIONS so a new region needs no
   * edit here; only `elsewhere`, which the adapter emits for her trips outside
   * the Rockies, carries meaning.
   */
  annie: SELF_RESOLVED,

  // Reads its own LOCATION column through the shared matcher.
  sonnybou: SELF_RESOLVED,

  // Its categories are activities, so the adapter reads the area from the post
  // title ("Sulphur Mountain, Banff June 1, 2019") through the shared matcher.
  billkerr: SELF_RESOLVED,

  // Each route page states a Region property, resolved through the matcher.
  adamlaycock: SELF_RESOLVED,

  // Its tags are regions, in Blackfoot as well as English.
  peaksandstreams: {
    'Tatsiki-Miistáki (Castle)': 'crowsnest-castle',
    'Crowsnest Pass': 'crowsnest-castle',
    'Oldman River': 'crowsnest-castle',
    'Paahtómahksikimi (Waterton)': 'waterton',
    'Akamina Provincial Park': 'waterton',
    'South Kananaskis': 'kananaskis-canmore',
    'Canmore': 'kananaskis-canmore',
    'Corbin / Flathead': 'bc-rockies-purcells',
    'Montana': 'glacier-montana',
    'Colorado': OUT_OF_SCOPE
  },

  // Marks anything outside the Rockies with a country in its title.
  steepsheep: SELF_RESOLVED,

  // Files most pages under a region path: /canada/kananaskis/, /canada/ghost/.
  // The rest are placed by the locality line each trip opens with, which the
  // adapter resolves through the shared matcher, hence SELF_RESOLVED too.
  spectacularmountains: {
    ...SELF_RESOLVED,
    'canada/kananaskis': 'kananaskis-canmore',
    // The Fairholme Range runs from Exshaw into Banff; Explor8ion files its
    // trips under Kananaskis, so they are kept together.
    'canada/fairholme-range': 'kananaskis-canmore',
    'canada/banff-lake-louise': 'banff',
    'canada/ya-ha-tinda': 'ghost-front-ranges',
    'canada/ghost': 'ghost-front-ranges',
    'canada/livingstone-range': 'crowsnest-castle',
    'canada/waterton': 'waterton',
    'canada/ram': 'david-thompson',
    'canada/kootenays': 'bc-rockies-purcells',
    // Localities the shared matcher does not know, mapped where every page using
    // one is filed in the same region by the site's own paths or by other blogs.
    // "High Rock Range", "Continental Divide" and "Forestry Trunk Rd" straddle
    // two regions each, and are left unmapped for the other signals to settle.
    'locality:Castle': 'crowsnest-castle',
    'locality:Dutch Creek Area': 'crowsnest-castle',
    'locality:Fairholme Range': 'kananaskis-canmore',
    'locality:Calgary Foothills': 'kananaskis-canmore',
    'international/switzerland': OUT_OF_SCOPE,
    'international/germany': OUT_OF_SCOPE,
    'international/saudi-arabia': OUT_OF_SCOPE,
    'international/iraq': OUT_OF_SCOPE,
    'international/namibia': OUT_OF_SCOPE,
    'international/ascension-island': OUT_OF_SCOPE,
    'international/angola': OUT_OF_SCOPE,
    'international/nicaragua': OUT_OF_SCOPE,
    'international/oman': OUT_OF_SCOPE
  },

  virtualhiker: {
    'Kananaskis Region': 'kananaskis-canmore',
    'Canmore Region': 'kananaskis-canmore',
    'Banff Region': 'banff',
    'Moraine Lake Region': 'banff',
    'Lake Louise': 'banff',
    'Mount Assiniboine Region': 'assiniboine',
    'Yoho': 'yoho',
    'Kootenay': 'kootenay',
    'Lake O’Hara Region': 'yoho',
    'Lake O\'Hara Region': 'yoho',
    'Icefields Parkway': 'icefields-parkway',
    'Castle Region': 'crowsnest-castle',
    // Verified against the posts themselves: Cheops, Avalanche, Perley Rock and
    // the Hermit Trail are all Rogers Pass, not Glacier National Park Montana.
    'Glacier Park': 'rogers-pass-selkirks',
    // Not places, or places this site does not cover. Listed rather than left
    // unmapped so these trips are dropped outright instead of arriving for
    // curation as though their region were merely unknown.
    'International': OUT_OF_SCOPE,
    'Qu\u00e9bec': OUT_OF_SCOPE,
    'New Hampshire': OUT_OF_SCOPE,
    'New York': OUT_OF_SCOPE,
    'Maine': OUT_OF_SCOPE,
    'Greenland': OUT_OF_SCOPE,
    'Iceland': OUT_OF_SCOPE,
    'Yukon': OUT_OF_SCOPE,
    'Laurentians': OUT_OF_SCOPE,
    'Border': OUT_OF_SCOPE
  }
}

/** The region one report names, mapped onto our taxonomy. */
export function mappedRegionOf(report: RawReport): string | undefined {
  return report.sourceRegion ? REGION_MAP[report.sourceId]?.[report.sourceRegion] : undefined
}

/**
 * Names shared by two different mountains, detected the same way near-miss
 * names are judged: by self-consistency within one source. If a single blog
 * files "Storm Mountain" under both Banff and Kananaskis, those are two peaks,
 * not one peak filed inconsistently — no blog lists the same summit twice in
 * different regions. Sources merely *disagreeing* with each other is a boundary
 * question, not a homonym, and is left merged.
 */
export function isHomonym(reports: readonly RawReport[]): boolean {
  const perSource = new Map<string, Set<string>>()
  for (const report of reports) {
    const mapped = mappedRegionOf(report)
    if (!mapped || mapped === OUT_OF_SCOPE) continue
    if (!perSource.has(report.sourceId)) perSource.set(report.sourceId, new Set())
    perSource.get(report.sourceId)!.add(mapped)
  }
  return [...perSource.values()].some(regions => regions.size > 1)
}

/**
 * The region stated by the most trusted blog among `reports`, or undefined
 * when none states one we cover.
 */
export function strongestStatedRegion(reports: readonly RawReport[]): string | undefined {
  const ranked = reports
    .map(report => ({ regionId: mappedRegionOf(report), rank: rank(report.sourceId) }))
    .filter(entry => entry.regionId && entry.regionId !== OUT_OF_SCOPE)
    .sort((left, right) => left.rank - right.rank)
  return ranked[0]?.regionId
}

function rank(sourceId: string): number {
  const index = REGION_PRIORITY.indexOf(sourceId)
  return index === -1 ? REGION_PRIORITY.length : index
}
