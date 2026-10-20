/**
 * billkerr.ca — self-hosted WordPress. Its category pages are hand-written link
 * lists whose anchor text is sometimes the bare URL, so the REST API is read
 * instead.
 *
 * The blog covers far more than mountains — resort ski days, hockey, a house
 * build, a charity fundraiser — so posts are filtered by WordPress category to
 * the outings that name a mountain objective. Categories describe the activity
 * rather than the place, so the region is looked for in the title first, which
 * sometimes carries one ("Sulphur Mountain, Banff June 1, 2019"), and in the
 * post's tags otherwise. Most posts are tagged with an area — "Kananaskis" on
 * 125 of them, "Banff", "canmore", "crowsnest", "kootenay park" — among tags
 * that are not places at all ("ridge", "snow", "AT"), which the area matcher
 * passes over.
 */
import type { Fetcher } from '../fetch.ts'
import { SourceChangedError } from '../errors.ts'
import type { RawReport } from '../types.ts'
import { splitObjectives } from '../canon.ts'
import { matchArea } from '../areas.ts'
import { decodeEntities } from '../html.ts'
import { PAGE_SIZE, readAllPages } from './selfhosted-wordpress.ts'

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
const NOT_A_TRIP = /house|hockey|fundrais|charity|\bmove to\b|rehab|diet|stretch|radios?\b|antenna|equipment|review|skate|kayak|\bfish\b|sky dive|birthday|wedding|surgery|misc posts|\bsled\b|avalanche hazard|notable or significant/i

/** Activity words left on the end once the date has gone. "Scamble" is his typo, in more than one title. */
const TRAILING_ACTIVITY = /\s+(?:scramble|scamble|scrambling|ski|skiing|snowshoe|hike|hiking|climb|traverse|attempt|loop|trip)\s*$/i

/**
 * Activity words in front of the objective: "Scramble Chester Mountain",
 * "Hike scramble King Creek Ridge", "Ski Engadine Burn". Only taken off when a
 * capitalised name follows: "Ski up to Wawa Sunshine" is a description, and
 * cutting its first word would only make it a worse one.
 */
// Case-sensitive, so the lookahead really does need a capital: the activity
// words carry their own [Hh]-style alternation instead of an `i` flag.
const LEADING_ACTIVITY = /^(?:(?:[Hh]ik(?:e|ing)|[Ss]crambl(?:e|ing)|[Ss]nowshoe|[Ss]ki(?:ing)?)\s+)+(?=[A-Z0-9])/

/**
 * Where the trip was, after the objective: "Table Mountain in Castle area",
 * "Chisel Peak near Fairmount". It locates the objective rather than naming
 * it, so it is cut from the name; the area matcher still reads it from the
 * whole title. Only these two shapes are cut — a bare " in " is part of names
 * like "Hole in the Wall".
 */
const TRAILING_LOCATION = /\s+(?:in\s+\S.*\barea|near\s+\S.*)$/i

/**
 * Tags naming an area the shared matcher cannot take, because the word means
 * something else elsewhere: "Castle" is also Castle Mountain in Banff, and
 * there is a Columbia Valley by Chilliwack. On this blog each means one place.
 */
const TAG_AREAS: Readonly<Record<string, string>> = {
  'castle': 'crowsnest-castle',
  'columbia valley': 'bc-rockies-purcells',
  'height of rockies park': 'bc-rockies-purcells'
}

interface Category { readonly id: number, readonly name: string }
interface Tag { readonly id: number, readonly name: string }
interface Post { readonly link?: string, readonly title?: { readonly rendered?: string }, readonly tags?: readonly number[] }

function cleanTitle(raw: string): string {
  const withoutDate = decodeEntities(raw).replace(/\s+/g, ' ').trim().replace(FROM_FIRST_DATE, '').trim()
  let title = (withoutDate.split(PART_SEPARATOR)[0]?.trim() ?? '')
    .replace(LEADING_ACTIVITY, '')
    .replace(TRAILING_LOCATION, '')
  for (;;) {
    const next = title.replace(TRAILING_ACTIVITY, '').trim()
    if (next === title || !next) break
    title = next
  }
  return BARE_MONTH.test(title) || title.length < 4 ? '' : title
}

/**
 * The one area a post's tags name, or undefined when they name none or
 * disagree. A post tagged both "Banff" and "Kananaskis" is on a boundary or
 * tagged loosely, and the title and the other blogs are better placed to say
 * which.
 */
export function regionFromTags(names: readonly string[]): string | undefined {
  const regions = new Set(names.flatMap((name) => {
    const regionId = TAG_AREAS[name.toLowerCase()] ?? matchArea(name)
    return regionId ? [regionId] : []
  }))
  return regions.size === 1 ? [...regions][0] : undefined
}

async function tagNames(fetchText: Fetcher): Promise<Map<number, string>> {
  const tags = await readAllPages<Tag>(fetchText, page =>
    `${BASE}/wp-json/wp/v2/tags?per_page=${PAGE_SIZE}&page=${page}&_fields=id,name`)
  return new Map(tags.map(tag => [tag.id, decodeEntities(tag.name)]))
}

async function outingCategoryIds(fetchText: Fetcher): Promise<number[]> {
  const categories = JSON.parse(await fetchText(
    `${BASE}/wp-json/wp/v2/categories?per_page=100&_fields=id,name`)) as Category[]
  return categories.filter(c => OUTING_CATEGORIES.has(c.name.toLowerCase())).map(c => c.id)
}

export async function scrapeBillKerr(fetchText: Fetcher): Promise<RawReport[]> {
  const ids = await outingCategoryIds(fetchText)
  if (ids.length === 0) throw new SourceChangedError('billkerr', 'no outing categories matched; the site has been recategorised')

  const posts = await readAllPages<Post>(fetchText, page =>
    `${BASE}/wp-json/wp/v2/posts?categories=${ids.join(',')}`
    + `&per_page=${PAGE_SIZE}&page=${page}&_fields=title,link,tags`)
  const tags = await tagNames(fetchText)

  const reports = new Map<string, RawReport>()
  for (const post of posts) {
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
        ?? regionFromTags((post.tags ?? []).flatMap(id => tags.get(id) ?? []))
    })
  }
  return [...reports.values()]
}
