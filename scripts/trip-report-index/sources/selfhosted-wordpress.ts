/**
 * Shared reader for the self-hosted WordPress blogs.
 *
 * Unlike the WordPress.com pair in wordpress.ts, these expose the standard
 * `/wp-json/wp/v2/` API on their own domain, which returns titles and links
 * directly and needs no key.
 */
import type { Fetcher } from '../fetch.ts'
import { PageLimitError, SourceChangedError } from '../errors.ts'
import { fetchUnlessStatus } from '../fetch.ts'
import { decodeEntities } from '../html.ts'

/** Items per request; every caller's URL must ask for exactly this many. */
export const PAGE_SIZE = 100

/**
 * Well above the largest archive read (Spectacular Mountains, a handful of
 * pages). It exists so a pagination bug cannot loop forever, and is reported
 * rather than obeyed when reached.
 */
const MAX_PAGES = 50

interface Post {
  readonly link?: string
  readonly title?: { readonly rendered?: string }
}

export interface WordPressPost {
  readonly title: string
  readonly url: string
}

/**
 * Every item of a paginated `/wp-json/wp/v2/` collection, `urlOf(page)` giving
 * each page's URL.
 *
 * The API answers a page past the end with a 400, and that is the only failure
 * that ends the loop: anything else — a 500, a dropped connection — throws, since
 * stopping there would index part of the archive and look like all of it. So
 * does reaching MAX_PAGES without an end.
 */
export async function readAllPages<T>(
  fetchText: Fetcher,
  urlOf: (page: number) => string
): Promise<T[]> {
  const items: T[] = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await fetchUnlessStatus(fetchText, urlOf(page), 400)
    if (body === undefined) return items

    const batch: unknown = JSON.parse(body)
    if (!Array.isArray(batch)) throw new SourceChangedError(urlOf(page), 'expected a JSON array')
    items.push(...(batch as T[]))
    if (batch.length < PAGE_SIZE) return items
  }
  throw new PageLimitError(urlOf(1), MAX_PAGES)
}

/**
 * Every published entry of one type, following the API's pagination to the end.
 * `type` is 'posts' for a blog that writes trips as posts and 'pages' for one
 * that writes them as pages — Spectacular Mountains does the latter, which is
 * why its posts endpoint returns an empty list.
 *
 * `filter` is extra query parameters, for a blog whose trips are one category
 * among several — Coast Backcountry's `categories=…`.
 */
export async function readSelfHostedPosts(
  fetchText: Fetcher,
  base: string,
  type: 'posts' | 'pages' = 'posts',
  filter = ''
): Promise<WordPressPost[]> {
  const batch = await readAllPages<Post>(fetchText, page =>
    `${base}/wp-json/wp/v2/${type}?per_page=${PAGE_SIZE}&page=${page}&_fields=title,link${filter ? `&${filter}` : ''}`)
  return batch.flatMap((post) => {
    const title = decodeEntities(post.title?.rendered ?? '').replace(/\s+/g, ' ').trim()
    return title && post.link ? [{ title, url: post.link }] : []
  })
}
