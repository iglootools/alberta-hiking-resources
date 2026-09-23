/**
 * Shared reader for the two self-hosted WordPress blogs.
 *
 * Unlike the WordPress.com pair in wordpress.ts, these expose the standard
 * `/wp-json/wp/v2/` API on their own domain, which returns titles and links
 * directly and needs no key.
 */
import type { Fetcher } from '../fetch.ts'
import { decodeEntities } from '../html.ts'

const PAGE_SIZE = 100

interface Post {
  readonly link?: string
  readonly title?: { readonly rendered?: string }
}

export interface WordPressPost {
  readonly title: string
  readonly url: string
}

/**
 * Every published entry of one type, following the API's pagination to the end.
 * `type` is 'posts' for a blog that writes trips as posts and 'pages' for one
 * that writes them as pages — Spectacular Mountains does the latter, which is
 * why its posts endpoint returns an empty list.
 */
export async function readSelfHostedPosts(
  fetchText: Fetcher,
  base: string,
  type: 'posts' | 'pages' = 'posts'
): Promise<WordPressPost[]> {
  const posts: WordPressPost[] = []

  for (let page = 1; page <= 50; page += 1) {
    const url = `${base}/wp-json/wp/v2/${type}?per_page=${PAGE_SIZE}&page=${page}&_fields=title,link`
    const body = await fetchText(url).catch(() => undefined)
    // The API answers a page past the end with a 400, which is how the loop ends.
    if (body === undefined) break

    const batch = JSON.parse(body) as Post[] | { code?: string }
    if (!Array.isArray(batch) || batch.length === 0) break

    for (const post of batch) {
      const title = decodeEntities(post.title?.rendered ?? '').replace(/\s+/g, ' ').trim()
      if (title && post.link) posts.push({ title, url: post.link })
    }
    if (batch.length < PAGE_SIZE) break
  }
  return posts
}
