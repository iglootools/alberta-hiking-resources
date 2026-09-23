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
}

/** Emitted in this order, which is also the page order in the sidebar. */
export const REGIONS: readonly Region[] = [
  { id: 'kananaskis-canmore', icon: 'i-lucide-mountain-snow', title: 'Kananaskis Country and Canmore', description: 'Trip reports and GPS traces by objective for Kananaskis, the Elbow and Highwood, Smith-Dorrien, and the Canmore front ranges.' },
  { id: 'banff', icon: 'i-lucide-landmark', title: 'Banff National Park', description: 'Trip reports and GPS traces by objective for Banff, Lake Louise, Skoki, and Sunshine.' },
  { id: 'assiniboine', icon: 'i-lucide-pyramid', title: 'Mount Assiniboine', description: 'Trip reports and GPS traces by objective for Mount Assiniboine Provincial Park and its approaches.' },
  { id: 'yoho', icon: 'i-lucide-trees', title: 'Yoho National Park', description: 'Trip reports and GPS traces by objective for Yoho National Park, including Field and Lake O’Hara.' },
  { id: 'kootenay', icon: 'i-lucide-leaf', title: 'Kootenay National Park', description: 'Trip reports and GPS traces by objective for Kootenay National Park, along Highway 93 South.' },
  { id: 'icefields-parkway', icon: 'i-lucide-snowflake', title: 'Icefields Parkway and the Columbia Icefield', description: 'Trip reports and GPS traces by objective along the Icefields Parkway, the Wapta, and the Columbia Icefield.' },
  { id: 'david-thompson', icon: 'i-lucide-waves', title: 'David Thompson Country and the Bighorn', description: 'Trip reports and GPS traces by objective for Abraham Lake, Nordegg, the Siffleur, White Goat, and the Bighorn Backcountry.' },
  { id: 'jasper-robson', icon: 'i-lucide-triangle', title: 'Jasper and Mount Robson', description: 'Trip reports and GPS traces by objective for Jasper National Park and Mount Robson Provincial Park.' },
  { id: 'crowsnest-castle', icon: 'i-lucide-milestone', title: 'Crowsnest Pass and the Castle', description: 'Trip reports and GPS traces by objective for the Crowsnest Pass, the Castle, and the Livingstone and Whaleback ranges.' },
  { id: 'waterton', icon: 'i-lucide-sailboat', title: 'Waterton Lakes', description: 'Trip reports and GPS traces by objective for Waterton Lakes National Park and the Akamina Parkway.' },
  { id: 'ghost-front-ranges', icon: 'i-lucide-tent-tree', title: 'The Ghost and the Front Ranges', description: 'Trip reports and GPS traces by objective for the Ghost Wilderness, Ya Ha Tinda, the Red Deer River, and the foothills.' },
  { id: 'bc-rockies-purcells', icon: 'i-lucide-mountain', title: 'BC Rockies and the Purcells', description: 'Trip reports and GPS traces by objective for the East Kootenay, Elk Lakes, the Height of the Rockies, and the Purcells.' },
  { id: 'rogers-pass-selkirks', icon: 'i-lucide-cable-car', title: 'Rogers Pass, the Selkirks, and Golden', description: 'Trip reports and GPS traces by objective for Glacier National Park in BC, the Selkirks, and the peaks around Golden.' },
  { id: 'glacier-montana', icon: 'i-lucide-flag', title: 'Glacier National Park, Montana', description: 'Trip reports and GPS traces by objective for Glacier National Park in Montana, just south of Waterton.' },

  // Beyond the Rockies: weekend-trip range from Calgary rather than day-trip
  // range. Added because the Alpine Club and Hostelling International both hold
  // properties out here that otherwise had nowhere to be listed, and because
  // one source covers them properly.
  { id: 'sea-to-sky', icon: 'i-lucide-tram-front', title: 'Sea to Sky and the Coast Mountains', description: 'Trip reports and GPS traces by objective for Vancouver, the North Shore, Squamish, Whistler, and Pemberton.' },
  { id: 'fraser-valley', icon: 'i-lucide-cloud-drizzle', title: 'Fraser Valley and the Cascades', description: 'Trip reports and GPS traces by objective for Chilliwack, the Cheam Range, Manning Park, and the Coquihalla.' },
  { id: 'okanagan', icon: 'i-lucide-sun', title: 'Okanagan and Thompson', description: 'Trip reports and GPS traces by objective for Kamloops, Kelowna, Penticton, and the Okanagan ranges.' },
  { id: 'west-kootenay', icon: 'i-lucide-tree-pine', title: 'West Kootenay', description: 'Trip reports and GPS traces by objective for Nelson, the Kokanee Glacier, and the southern Selkirks.' },
  { id: 'vancouver-island', icon: 'i-lucide-ship', title: 'Vancouver Island', description: 'Trip reports and GPS traces by objective for Strathcona Park and the island ranges.' }
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
 * 64% of the time respectively, and a wrong region is worse than none. So these
 * objectives are published together rather than filed on a guess.
 */
export const UNSORTED: Region = {
  id: 'unsorted',
  icon: 'i-lucide-circle-help',
  title: 'Not yet sorted by region',
  description: 'Objectives whose region none of the source blogs states, published here rather than filed on a guess.'
}

/**
 * Sentinel for a source region that is deliberately out of scope — Explor8ion's
 * canoe trips in Manitoba and Ontario, Steven Song's international and coastal
 * BC peaks. Distinguished from "unrecognised" so that a source adding a region
 * we have never seen still fails loudly.
 */
export const OUT_OF_SCOPE = 'out-of-scope'

/**
 * Which source's region wins when two disagree, most trusted first. Explor8ion
 * leads because its regions are hand-curated per trip; Steep Sheep is absent
 * because it publishes none at all.
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
    // Monashees, the Cariboo, or northern BC — near enough to appear, far
    // enough from anything this site covers.
    ...SELF_RESOLVED,
    'area:Craigellachie,BC': OUT_OF_SCOPE,
    'area:Three Valley Gap,BC': OUT_OF_SCOPE,
    'area:Malakwa,BC': OUT_OF_SCOPE,
    'area:Monashee Provincial Park,BC': OUT_OF_SCOPE,
    'area:Keefer Lake,BC': OUT_OF_SCOPE,
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
    // Between the Okanagan and the Selkirks, and covered by nothing else here.
    'monashee-mountains': OUT_OF_SCOPE,
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

  // Files every page under a region path: /canada/kananaskis/, /canada/ghost/.
  spectacularmountains: {
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

/**
 * Picks one region for an objective from the regions its reports carry.
 *
 * This is also where cross-source inheritance happens: the reports passed in
 * are every report for one objective, from every source, so a Steep Sheep trip
 * that publishes no region is placed by whichever other blog also climbed it.
 *
 * `regionId` is absent when no report names a region we recognise. `outOfScope`
 * says the objective was placed, but somewhere this site does not cover — which
 * means drop it, not that it needs curating.
 */
export interface RegionResolution {
  readonly regionId?: string
  readonly outOfScope: boolean
  readonly conflicts: readonly string[]
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

export function resolveRegion(reports: readonly RawReport[]): RegionResolution {
  const byRegion = new Map<string, Set<string>>()
  let outOfScope = false

  for (const report of reports) {
    const mapped = mappedRegionOf(report)
    if (mapped === OUT_OF_SCOPE) {
      outOfScope = true
      continue
    }
    if (!mapped) continue
    if (!byRegion.has(mapped)) byRegion.set(mapped, new Set())
    byRegion.get(mapped)!.add(report.sourceId)
  }
  if (byRegion.size === 0) return { outOfScope, conflicts: [] }

  const ranked = [...byRegion.entries()].sort((left, right) => rank(left[1]) - rank(right[1]))
  const conflicts = byRegion.size > 1
    ? ranked.map(([regionId, sourceIds]) => `${regionId} (${[...sourceIds].sort().join(', ')})`)
    : []
  return { regionId: ranked[0]![0], outOfScope: false, conflicts }
}

function rank(sourceIds: ReadonlySet<string>): number {
  const ranks = [...sourceIds].map((id) => {
    const index = REGION_PRIORITY.indexOf(id)
    return index === -1 ? REGION_PRIORITY.length : index
  })
  return Math.min(...ranks)
}
