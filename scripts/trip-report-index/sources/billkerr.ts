/**
 * billkerr.ca — self-hosted WordPress. Its category pages are hand-written link
 * lists whose anchor text is sometimes the bare URL, so the REST API is read
 * instead.
 *
 * The blog covers far more than mountains — resort ski days, hockey, a house
 * build, a charity fundraiser — so posts are filtered by WordPress category to
 * the outings that name a mountain objective. Categories describe the activity
 * rather than the place, so the region is looked for in the title instead,
 * which often carries one ("Sulphur Mountain, Banff June 1, 2019").
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import { splitObjectives } from '../canon.ts'
import { matchArea } from '../areas.ts'
import { decodeEntities } from '../html.ts'

const BASE = 'https://www.billkerr.ca'

/** Categories whose posts are an outing to a named objective. */
const OUTING_CATEGORIES = new Set([
  'scramble', 'winter scramble', 'hike', 'alpine climb', 'rock climb',
  'ski mountaineering', 'backcountry ski', 'snowshoeing', 'hut',
  'backcountry camping', 'bivy'
])

const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec'

/**
 * The date, in the many shapes this blog writes it: "May 21, 2023",
 * "April 26/09", "Feb 25 - Feb 28, 2012", "Aug 10th", "Mid Jan/2011". Everything
 * from the first date onwards is dropped, because what follows it is the date's
 * tail, the conditions, or the gear rather than the objective.
 */
const FROM_FIRST_DATE = new RegExp(
  `[\\s,/-]+(?:mid\\s+)?(?:${MONTHS})[a-z]*\\.?\\s*\\d{0,2}(?:st|nd|rd|th)?\\s*[,/-]?\\s*(?:\\d{4}|\\d{2})?\\b[\\s\\S]*$`, 'i')

/**
 * Objective first, then grade, area or conditions. Splitting on the separator
 * keeps "Devil's Head Crux" out of "Devil's Head Crux - Climb Scramble, Ghost
 * Area", and hands the remainder to the area matcher.
 */
const PART_SEPARATOR = /\s+[\u2013\u2014-]\s+|,\s*/

/** A month on its own, left behind when the whole title was a date. */
const BARE_MONTH = new RegExp(`^(?:${MONTHS})[a-z]*\\.?$`, 'i')

/** Posts filed under an outing category that are not an outing. */
const NOT_A_TRIP = /house|hockey|fundrais|charity|\bmove to\b|rehab|diet|stretch|radios?\b|equipment|review|skate|kayak|\bfish\b|sky dive|birthday|wedding/i

/** Activity words left on the end once the date has gone. */
const TRAILING_ACTIVITY = /\s+(?:scramble|scrambling|ski|skiing|snowshoe|hike|hiking|climb|traverse|attempt|loop|trip)\s*$/i

interface Category { readonly id: number, readonly name: string }
interface Post { readonly link?: string, readonly title?: { readonly rendered?: string } }

function cleanTitle(raw: string): string {
  const withoutDate = decodeEntities(raw).replace(/\s+/g, ' ').trim().replace(FROM_FIRST_DATE, '').trim()
  let title = withoutDate.split(PART_SEPARATOR)[0]?.trim() ?? ''
  for (;;) {
    const next = title.replace(TRAILING_ACTIVITY, '').trim()
    if (next === title || !next) break
    title = next
  }
  return BARE_MONTH.test(title) || title.length < 4 ? '' : title
}

async function outingCategoryIds(fetchText: Fetcher): Promise<number[]> {
  const categories = JSON.parse(await fetchText(
    `${BASE}/wp-json/wp/v2/categories?per_page=100&_fields=id,name`)) as Category[]
  return categories.filter(c => OUTING_CATEGORIES.has(c.name.toLowerCase())).map(c => c.id)
}

export async function scrapeBillKerr(fetchText: Fetcher): Promise<RawReport[]> {
  const ids = await outingCategoryIds(fetchText)
  if (ids.length === 0) throw new Error('billkerr: no outing categories matched; the site has been recategorised')

  const reports = new Map<string, RawReport>()
  for (let page = 1; page <= 20; page += 1) {
    const url = `${BASE}/wp-json/wp/v2/posts?categories=${ids.join(',')}`
      + `&per_page=100&page=${page}&_fields=title,link`
    const body = await fetchText(url).catch(() => undefined)
    if (body === undefined) break

    const batch = JSON.parse(body) as Post[]
    if (!Array.isArray(batch) || batch.length === 0) break

    for (const post of batch) {
      const raw = post.title?.rendered ?? ''
      const title = cleanTitle(raw)
      if (!title || !post.link || reports.has(post.link)) continue
      if (NOT_A_TRIP.test(decodeEntities(raw))) continue
      reports.set(post.link, {
        sourceId: 'billkerr',
        title,
        url: post.link,
        objectives: splitObjectives(title),
        sourceRegion: matchArea(decodeEntities(raw))
      })
    }
    if (batch.length < 100) break
  }
  return [...reports.values()]
}
