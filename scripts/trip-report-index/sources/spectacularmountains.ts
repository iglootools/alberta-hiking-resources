/**
 * spectacularmountains.com — self-hosted WordPress that files most trips under
 * a region path: /canada/kananaskis/, /canada/ya-ha-tinda/, /canada/ghost/,
 * /international/switzerland/ and so on.
 *
 * That path is the region, read straight off the page's own URL. Trips are
 * written as WordPress pages here, not posts.
 *
 * Not every trip is filed, though: about a hundred sit at the site root
 * (/gaff-peak/, /puigmal/), Canadian and international alike. What every trip
 * page has is a header line naming the locality before the date — "Elkford,
 * BC, Canada 24 September 2021", "Pyrenees, Spain 8 June 2018" — the same kind
 * of line Bob Spirko heads his reports with, read the same way. Its absence is
 * just as useful: a page that does not open with a date is not a trip at all
 * but the About page, the disclaimer, a region's introduction, or one of the
 * Rakayib camel-caravan articles, none of which name an objective.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import { matchArea } from '../areas.ts'
import { splitObjectives } from '../canon.ts'
import { readSelfHostedPosts } from './selfhosted-wordpress.ts'

const BASE = 'https://www.spectacularmountains.com'

/**
 * `/canada/kananaskis/mount-kidd/` -> "canada/kananaskis".
 *
 * Only `canada` and `international` are regions. The site also nests article
 * series two deep (`/rakayib/preparations/`), which look the same shape but
 * name no place.
 */
const REGION_PREFIX = /^(canada|international)$/

function regionFromPath(url: string): string | undefined {
  const [area, region] = new URL(url).pathname.split('/').filter(Boolean)
  return area && region && REGION_PREFIX.test(area) ? `${area}/${region}` : undefined
}

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'

/**
 * The trip's date: "9 August 2025", a span such as "26 & 27 July 2025", or the
 * ISO form one page uses ("Winter ascent (attempt) on 2019-10-06").
 */
const DATE = new RegExp(`\\b\\d{1,2}(?:\\s*[-–&+]\\s*\\d{1,2})?\\s*(?:${MONTHS})\\s+\\d{4}\\b|\\b\\d{4}-\\d{2}-\\d{2}\\b`)

/** How far into the page the date may be: past the locality line, never into the prose. */
const OPENING_LENGTH = 120

/** A page that dates itself like a trip but is the author's own scaffolding. */
const NOT_A_TRIP_TITLE = /\btemplate\b/i

const ALBERTA_OR_BC = /\b(?:AB|BC|Alberta|British Columbia)\b/
const CANADA = /\bCanada\b/
const UNITED_STATES = /\b(?:USA|United States|Montana|MT|Washington|WA|Idaho|ID)\b/

/**
 * The locality line, or undefined when the page does not open with a date and
 * so is not a trip. Older trips open with the date itself and name no
 * locality, which gives an empty string: still a trip, with nothing to place
 * it by.
 */
export function tripLocality(text: string): string | undefined {
  const date = DATE.exec(text.slice(0, OPENING_LENGTH))
  return date ? text.slice(0, date.index).trim() : undefined
}

/**
 * A locality as a region id, `elsewhere`, or — for a Canadian locality the
 * keyword table does not know — `locality:` and its first part ("locality:Castle"),
 * which regions.ts maps where the author's usage is consistent. "Castle"
 * alone cannot go in the shared table, where it would also catch Castle
 * Mountain in Banff; on this site it always means the Castle parks.
 *
 * Only a Canadian or American locality is matched by keyword. The table is
 * written for the Rockies and the BC interior, and words in it — "field",
 * "spray", "nelson", "ghost" — are common enough elsewhere to match a
 * European or African place by accident; a trip abroad is out of scope
 * whatever it is called.
 */
export function regionOfLocality(locality: string): string | undefined {
  if (!locality) return undefined
  if (ALBERTA_OR_BC.test(locality) || CANADA.test(locality)) {
    return matchArea(locality) ?? `locality:${locality.split(',')[0]!.trim()}`
  }
  if (UNITED_STATES.test(locality)) return matchArea(locality) ?? 'elsewhere'
  return 'elsewhere'
}

export async function scrapeSpectacularMountains(fetchText: Fetcher): Promise<RawReport[]> {
  const pages = await readSelfHostedPosts(fetchText, BASE, 'pages', '', { withContent: true })
  return pages.flatMap((page) => {
    const locality = tripLocality(page.text ?? '')
    if (locality === undefined || NOT_A_TRIP_TITLE.test(page.title)) return []
    const sourceRegion = regionFromPath(page.url) ?? regionOfLocality(locality)
    return [{
      sourceId: 'spectacularmountains',
      title: page.title,
      url: page.url,
      objectives: splitObjectives(page.title),
      ...(sourceRegion ? { sourceRegion } : {})
    }]
  })
}
