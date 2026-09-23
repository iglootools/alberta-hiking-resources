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

export async function scrapePeaksAndStreams(fetchText: Fetcher): Promise<RawReport[]> {
  const tags = JSON.parse(await fetchText(
    `${BASE}/wp-json/wp/v2/tags?per_page=100&_fields=id,name`)) as Tag[]
  const names = new Map(tags.map(tag => [tag.id, decodeEntities(tag.name)]))

  const reports: RawReport[] = []
  for (let page = 1; page <= 20; page += 1) {
    const url = `${BASE}/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=title,link,tags`
    const body = await fetchText(url).catch(() => undefined)
    if (body === undefined) break

    const batch = JSON.parse(body) as Post[]
    if (!Array.isArray(batch) || batch.length === 0) break

    for (const post of batch) {
      const title = decodeEntities(post.title?.rendered ?? '')
        .replace(/\s+/g, ' ').trim().replace(TRAILING_DATE, '').trim()
      if (!title || !post.link) continue

      const region = (post.tags ?? [])
        .map(id => names.get(id))
        .find(name => name && !NOT_A_REGION.test(name))

      reports.push({
        sourceId: 'peaksandstreams',
        title,
        url: post.link,
        objectives: splitObjectives(title),
        sourceRegion: region
      })
    }
    if (batch.length < 100) break
  }
  return reports
}
