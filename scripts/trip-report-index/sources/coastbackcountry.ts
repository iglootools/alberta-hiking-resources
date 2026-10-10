/**
 * coastbackcountry.com — Matt Gunn, author of *Scrambles in Southwest British
 * Columbia*. Self-hosted WordPress, read through the REST API and limited to
 * its `scramble` category.
 *
 * The guidebook page's own "trip reports" link is not the index to read: it
 * leads to an A–Z list of the author's ski touring reports, some 340 of them.
 * Those are winter lines on the same peaks and would swamp the scrambles if
 * indexed alongside them, so only the category is read.
 *
 * It publishes no region anywhere — no tags, and categories that name an
 * activity rather than a place — and the post bodies are a line or two of
 * prose. Every scramble is in the Coast Mountains or the Cascades, so its
 * objectives are placed by inheritance from Steven Song, who covers both, or by
 * a REGION_OVERRIDES entry.
 */
import type { Fetcher } from '../fetch.ts'
import { SourceChangedError } from '../errors.ts'
import type { RawReport } from '../types.ts'
import { splitObjectives } from '../canon.ts'
import { readSelfHostedPosts } from './selfhosted-wordpress.ts'

const BASE = 'https://coastbackcountry.com'

/** Read by slug, so a category renumbered upstream still resolves. */
const TRIPS = 'scramble'
/** A film and its press, filed under `scramble` as well. */
const NOT_A_TRIP = 'media'

/**
 * Summits are joined with separators canon.ts does not split on, because in
 * other sources they occur inside a name: "Thar Peak – Nak Peak – Yak Peak",
 * "Coquihalla Peak and Tulameen Mountain", "Outrigger Peak to Sun Peak".
 */
const SUMMIT_SEPARATOR = /\s+(?:–|-|and|to)\s+/i

/**
 * Route and outcome suffixes, which name how the summit was climbed rather than
 * what it is: "Needle Peak Northeast Ridge", "Crown Mountain Crater Slabs",
 * "Edge Peak White Dyke Attempt". Stripped so they join the same objective
 * other sources report under its plain name.
 */
const ROUTE_SUFFIX = /\s+(?:(?:north|south|east|west|northeast|northwest|southeast|southwest|ne|nw|se|sw)\s+(?:ridge|face|arete)|crater slabs|white dyke|attempt)\b.*$/i

interface Category { readonly id: number, readonly slug: string }

async function categoryIds(fetchText: Fetcher): Promise<Map<string, number>> {
  const url = `${BASE}/wp-json/wp/v2/categories?slug=${TRIPS},${NOT_A_TRIP}&_fields=id,slug`
  const categories = JSON.parse(await fetchText(url)) as Category[]
  const ids = new Map(categories.map(category => [category.slug, category.id]))
  for (const slug of [TRIPS, NOT_A_TRIP]) {
    if (!ids.has(slug)) throw new SourceChangedError('coastbackcountry', `no "${slug}" category any more (${url})`)
  }
  return ids
}

function objectivesOf(title: string): string[] {
  return title.split(SUMMIT_SEPARATOR)
    .flatMap(splitObjectives)
    .map(name => name.replace(ROUTE_SUFFIX, '').trim())
    .filter(Boolean)
}

export async function scrapeCoastBackcountry(fetchText: Fetcher): Promise<RawReport[]> {
  const ids = await categoryIds(fetchText)
  const filter = `categories=${ids.get(TRIPS)}&categories_exclude=${ids.get(NOT_A_TRIP)}`

  return (await readSelfHostedPosts(fetchText, BASE, 'posts', filter)).map(post => ({
    sourceId: 'coastbackcountry',
    title: post.title,
    url: post.url,
    objectives: objectivesOf(post.title)
  }))
}
