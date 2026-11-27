/**
 * What the rest of the index knows about each source, without its scraper.
 *
 * Building, placing and rendering need a source's id, its name and its rank,
 * never how it is read. Keeping those here rather than in the registry
 * (index.ts) means the pure core and its tests load none of the fifteen
 * adapters, and an adapter that fails to load breaks only the run.
 */

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

/** The source's name as the pages credit it, or the id itself for one the catalog lacks. */
export function sourceLabel(sourceId: string): string {
  return Object.hasOwn(DETAILS, sourceId) ? DETAILS[sourceId as SourceId].label : sourceId
}

/** The source ids in the order their links appear under an objective. */
export const SOURCE_ORDER: readonly string[] = SOURCE_IDS
