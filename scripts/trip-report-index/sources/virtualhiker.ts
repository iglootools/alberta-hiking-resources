/**
 * virtualhiker.wordpress.com — trips as posts, with the region as a category
 * ("Kananaskis Region", "Icefields Parkway"). Categories that are not places
 * ("Hiking", "Snowshoeing", "Cycling") are ignored, and so are the ones outside
 * the Rockies; both fall through to REGION_MAP returning nothing.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import { REGION_MAP } from '../regions.ts'
import { readWordPress } from './wordpress.ts'
import { splitObjectives } from '../canon.ts'

const SITE = 'virtualhiker.wordpress.com'

export async function scrapeVirtualHiker(fetchText: Fetcher): Promise<RawReport[]> {
  const known = REGION_MAP.virtualhiker ?? {}
  return (await readWordPress(fetchText, SITE, 'post')).map(item => ({
    sourceId: 'virtualhiker',
    title: item.title,
    url: item.url,
    objectives: splitObjectives(item.title),
    sourceRegion: item.categories.find(category => known[category] !== undefined)
  }))
}
