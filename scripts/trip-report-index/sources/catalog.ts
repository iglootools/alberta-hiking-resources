/**
 * What the rest of the index knows about each source, without its scraper: its
 * id, name and order, its region vocabulary, and how far its regions are
 * trusted.
 *
 * Building, placing and rendering need those, never how a source is read. Keeping those here rather than in the registry
 * (index.ts) means the pure core and its tests load none of the fifteen
 * adapters, and an adapter that fails to load breaks only the run.
 */
import { OUT_OF_SCOPE, REGIONS } from '../regions.ts'

/**
 * Every source, in the order their links appear under an objective, so the two
 * archives with the widest coverage come first.
 *
 * climbglacier.com is deliberately absent: its 44 pages are the guidebook
 * series and its blog, with no per-peak route reports to index. It stays a
 * plain link on the trip reports page.
 */
export const SOURCE_IDS = [
  'spirko',
  'explor8ion',
  'stevensong',
  'goldenscrambles',
  'annie',
  'virtualhiker',
  'sonnybou',
  'anugara',
  'adamlaycock',
  'spectacularmountains',
  'ontop',
  'peaksandstreams',
  'billkerr',
  'coastbackcountry',
  'steepsheep'
] as const

/** A source's id, which a typo cannot pass for. */
export type SourceId = typeof SOURCE_IDS[number]

/** A source blog, as credited in the generated pages. */
export interface Source {
  readonly id: SourceId
  readonly label: string
  readonly home: string
}

const DETAILS: Readonly<Record<SourceId, Omit<Source, 'id'>>> = {
  spirko: { label: 'Bob Spirko', home: 'http://bobspirko.ca/' },
  explor8ion: { label: 'Explor8ion', home: 'https://www.explor8ion.com/' },
  stevensong: { label: 'Steven Song', home: 'https://stevensong.com/' },
  goldenscrambles: { label: 'Golden Scrambles', home: 'http://goldenscrambles.ca/' },
  annie: { label: 'Annie Ouellet', home: 'https://www.youtube.com/@AnnieSteveClimbingTheRockies' },
  virtualhiker: { label: 'Virtual Hiker', home: 'https://virtualhiker.wordpress.com/' },
  sonnybou: { label: 'Sonny Bou', home: 'https://sonnybou.ca/scrambles/' },
  anugara: { label: 'Andrew Nugara', home: 'https://anugara.net/log.html' },
  adamlaycock: { label: 'Adam Laycock', home: 'https://adamlaycock.ca/routes/' },
  spectacularmountains: { label: 'Spectacular Mountains', home: 'https://www.spectacularmountains.com/' },
  ontop: { label: 'On-Top', home: 'https://www.on-top.ca/' },
  peaksandstreams: { label: 'Peaks and Streams', home: 'https://peaksandstreams.com/' },
  billkerr: { label: 'Bill Kerr', home: 'https://www.billkerr.ca/' },
  coastbackcountry: { label: 'Coast Backcountry', home: 'https://coastbackcountry.com/scrambling-in-southwest-british-columbia/' },
  steepsheep: { label: 'Steep Sheep', home: 'https://steepsheep.ca/' }
}

/** Every source, in SOURCE_IDS order. */
export const SOURCE_CATALOG: readonly Source[] = SOURCE_IDS.map(id => ({ id, ...DETAILS[id] }))

/** The source's name as the pages credit it. */
export function sourceLabel(sourceId: SourceId): string {
  return DETAILS[sourceId].label
}

/**
 * A source's position in `order`, or the end of it for a source `order` leaves
 * out, so that every ranking puts an unlisted source last.
 */
export function rankIn(order: readonly string[], sourceId: string): number {
  const index = order.indexOf(sourceId)
  return index === -1 ? order.length : index
}

/** The source ids in the order their links appear under an objective. */
export const SOURCE_ORDER: readonly SourceId[] = SOURCE_IDS

/**
 * Blogs by how much their region is trusted, most first. An objective is listed
 * under every region a blog states, so this no longer picks a winner; it orders
 * the claims on the page, and picks the peak that keeps a homonym's unfiled
 * reports. Explor8ion leads because its regions are hand-curated per trip; Steep
 * Sheep is absent because it publishes none at all.
 */
export const REGION_PRIORITY: readonly SourceId[] = [
  'explor8ion',
  'spirko',
  'annie',
  'goldenscrambles',
  'stevensong',
  'virtualhiker'
]

/** A source's own region labels, each mapped onto a region id or OUT_OF_SCOPE. */
export type RegionVocabulary = Readonly<Record<string, string>>

/**
 * Entries for a source that resolves its own free-text locality to a region id
 * (see areas.ts), so its map is the identity plus the `elsewhere` marker those
 * matchers emit for somewhere this site does not cover. Built from REGIONS, so
 * adding a region needs no edit here.
 */
const SELF_RESOLVED: RegionVocabulary = {
  ...Object.fromEntries(REGIONS.map(region => [region.id, region.id])),
  elsewhere: OUT_OF_SCOPE
}

/**
 * Per-source region vocabulary, mapped onto REGIONS or OUT_OF_SCOPE. Keyed by
 * source id, so a mistyped one fails to compile rather than silently leaving
 * its source unmapped. A source absent here states no region.
 */
export const REGION_MAP: Readonly<Partial<Record<SourceId, RegionVocabulary>>> = {
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
    // "Rocky Mountain Foothills" is left unmapped: Explor8ion files foothills
    // trips from the Sheep River to the Ghost under it, so it says which side
    // of the mountains, not which region. Its trips are placed by their
    // companions and positions instead.
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
    // Bob Spirko's "BC" folder runs from Kootenay National Park to Smithers, so
    // it is left unmapped and its reports fall back on their own locality line.
    // Mapping it to the BC Rockies outranked "Kootenay National Park, B.C." in
    // the report itself, and is a large part of why Kootenay was a sliver.
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
    // 'bc-rockies' is left unmapped: Steven Song files everything west of the
    // Divide under it, Mount Robson and Whitehorn as well as the Elk Valley, so
    // a fifth of it is in Jasper and Mount Robson rather than the BC Rockies.
    // Its peaks are placed by position and by the other blogs instead.
    // 'selkirk-mountains' is left unmapped too: it runs from Rogers Pass to the
    // Valhallas, a third of it in the West Kootenay. See 'bc-rockies' above.
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
