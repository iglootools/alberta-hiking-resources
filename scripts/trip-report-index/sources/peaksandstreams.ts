/**
 * peaksandstreams.com — WordPress, read through the REST API rather than the
 * sitemap because its **tags** are regions: "Tatsiki-Miistáki (Castle)",
 * "Paahtómahksikimi (Waterton)", "Crowsnest Pass", "Corbin / Flathead". Its
 * single category ("Scrambles & Hikes") says nothing about place, so the tags
 * are the only region this blog publishes — and they cover nearly every post.
 *
 * Titles end in the date the trip was done, which is stripped here since
 * canon.ts only knows about elevations.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import { splitObjectives } from '../canon.ts'
import { decodeEntities } from '../html.ts'
import { PAGE_SIZE, readAllPages } from './selfhosted-wordpress.ts'

const BASE = 'https://peaksandstreams.com'

const MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december'
/** ", 3 July, 2013" and the like. */
const TRAILING_DATE = new RegExp(`[\\s,-]+\\d{0,2}\\s*(?:${MONTHS})[a-z]*,?\\s*\\d{0,2},?\\s*\\d{4}\\s*$`, 'i')

/** Tags that describe the outing rather than where it was. */
const NOT_A_REGION = /^(snowshoe|ski|winter|summer)$/i

interface Tag { readonly id: number, readonly name: string }
interface Post {
  readonly link?: string
  readonly title?: { readonly rendered?: string }
  readonly tags?: readonly number[]
}

function toReport(post: Post, tagNames: ReadonlyMap<number, string>): RawReport | undefined {
  const title = decodeEntities(post.title?.rendered ?? '')
    .replace(/\s+/g, ' ').trim().replace(TRAILING_DATE, '').trim()
  if (!title || !post.link) return undefined

  const region = (post.tags ?? [])
    .map(id => tagNames.get(id))
    .find(name => name && !NOT_A_REGION.test(name))

  return {
    sourceId: 'peaksandstreams',
    title,
    url: post.link,
    objectives: splitObjectives(title),
    sourceRegion: region
  }
}

export async function scrapePeaksAndStreams(fetchText: Fetcher): Promise<RawReport[]> {
  const tags = JSON.parse(await fetchText(
    `${BASE}/wp-json/wp/v2/tags?per_page=100&_fields=id,name`)) as Tag[]
  const tagNames = new Map(tags.map(tag => [tag.id, decodeEntities(tag.name)]))

  const posts = await readAllPages<Post>(fetchText, page =>
    `${BASE}/wp-json/wp/v2/posts?per_page=${PAGE_SIZE}&page=${page}&_fields=title,link,tags`)
  return posts.flatMap(post => toReport(post, tagNames) ?? [])
}
