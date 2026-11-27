/**
 * steepsheep.ca — trips are WordPress *pages*, not posts, and carry no category
 * at all, so every objective here is placed by inheritance from another source
 * or by a REGION_OVERRIDES entry.
 *
 * Titles append elevation ("Mount Temple 3544m"), which canon.ts strips, and
 * mark anything outside the Rockies with a country in brackets — "Avalanche
 * Peak (NZ) 1833m", "Mount Rosea (Aus) 1009m". That bracket is read here,
 * before the name is cleaned, because canon.ts drops it along with the
 * elevation and the signal would be lost with it.
 *
 * The bracket is the only place a title says where it is. The rest of a title
 * is the peak's name, and running the area matcher over it only finds place
 * words that happen to be part of the name: Mount Nelson, in the Purcells,
 * would be filed under West Kootenay for the town of Nelson.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import { readWordPress } from './wordpress.ts'
import { splitObjectives } from '../canon.ts'

const SITE = 'steepsheep.ca'

/** The country brackets the site uses, for the trips it marks as abroad. */
const ABROAD = /\((?:NZ|Aus)\)/i

/** Pages that are site furniture rather than a trip. */
const NOT_A_TRIP = /^(about|home|contact|blog|trip reports?|index|peaks?|privacy)/i

export async function scrapeSteepSheep(fetchText: Fetcher): Promise<RawReport[]> {
  return (await readWordPress(fetchText, SITE, 'page'))
    .filter(item => !NOT_A_TRIP.test(item.title))
    .map(item => ({
      sourceId: 'steepsheep',
      title: item.title,
      url: item.url,
      objectives: splitObjectives(item.title),
      ...(ABROAD.test(item.title) ? { sourceRegion: 'elsewhere' } : {})
    }))
}
