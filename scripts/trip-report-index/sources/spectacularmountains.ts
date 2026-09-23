/**
 * spectacularmountains.com — self-hosted WordPress that files every post under
 * a region path: /canada/kananaskis/, /canada/ya-ha-tinda/, /canada/ghost/,
 * /international/switzerland/ and so on.
 *
 * That path is the region, read straight off the page's own URL, which makes
 * this one of the few sources that places most of its own objectives. Trips are
 * written as WordPress pages here, not posts.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
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

export async function scrapeSpectacularMountains(fetchText: Fetcher): Promise<RawReport[]> {
  return (await readSelfHostedPosts(fetchText, BASE, 'pages')).map(post => ({
    sourceId: 'spectacularmountains',
    title: post.title,
    url: post.url,
    objectives: splitObjectives(post.title),
    sourceRegion: regionFromPath(post.url)
  }))
}
