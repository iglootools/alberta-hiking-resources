/**
 * Shared reader for the two WordPress.com-hosted blogs.
 *
 * Both sites 404 on `/wp-json/` because they are hosted rather than self-hosted,
 * but the public WordPress.com REST API serves them by domain. It returns
 * titles and categories directly, which is far better than deriving names from
 * slugs and saves one request per post.
 */
import type { Fetcher } from '../fetch.ts'
import { decodeEntities } from '../html.ts'

const API = 'https://public-api.wordpress.com/rest/v1.1/sites'
const PAGE_SIZE = 100

/** One entry as the API returns it, narrowed to the fields we ask for. */
interface WordPressEntry {
  readonly title: string
  readonly URL: string
  readonly categories?: Readonly<Record<string, unknown>>
}

interface WordPressPage {
  readonly found?: number
  readonly posts?: readonly WordPressEntry[]
  readonly error?: string
  readonly message?: string
}

export interface WordPressItem {
  readonly title: string
  readonly url: string
  readonly categories: readonly string[]
}

/**
 * Reads every entry of one post type. `type` is 'post' for a blog that writes
 * trips as posts, 'page' for one that writes them as pages — Steep Sheep does
 * the latter, which is why its seven posts are not its trip reports.
 */
export async function readWordPress(
  fetchText: Fetcher,
  site: string,
  type: 'post' | 'page'
): Promise<WordPressItem[]> {
  const items: WordPressItem[] = []

  for (let page = 1; ; page += 1) {
    const url = `${API}/${site}/posts/?type=${type}&number=${PAGE_SIZE}&page=${page}`
      + '&fields=title,URL,categories'
    const body = JSON.parse(await fetchText(url)) as WordPressPage
    if (body.error) throw new Error(`${site}: ${body.error} ${body.message ?? ''}`.trim())

    const batch = body.posts ?? []
    items.push(...batch.map(entry => ({
      title: decodeEntities(entry.title).replace(/\s+/g, ' ').trim(),
      url: entry.URL,
      categories: Object.keys(entry.categories ?? {})
    })))

    if (batch.length < PAGE_SIZE || items.length >= (body.found ?? 0)) break
  }
  return items
}
