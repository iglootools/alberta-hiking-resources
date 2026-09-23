/**
 * adamlaycock.ca — a Quartz site whose folder listings are rendered in the
 * browser, so the pages themselves have no links to follow. Quartz publishes
 * the whole thing as JSON at /static/contentIndex.json instead, which is both
 * cheaper and more reliable than crawling would have been.
 *
 * The index carries guidebook tags (`kane/moderate`, `dwyt/premiere`, `11ker`)
 * but no region. Each route page states one as a labelled property, so the page
 * is fetched for it — one request per route, once, against the cache.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import { splitObjectives } from '../canon.ts'
import { matchArea } from '../areas.ts'
import { decodeEntities, textOf } from '../html.ts'

/**
 * `<div class="meta-stat"><span class="meta-stat-value">Bow Valley</span>
 * <span class="meta-stat-name">Region</span></div>`.
 *
 * The opening div is part of the pattern on purpose: Region is not always the
 * first stat, and without it a lazy match starts at the elevation above and
 * swallows "2514 m Summit elevation" into the region's name.
 */
const REGION_PROPERTY = new RegExp(
  '<div class="meta-stat">\\s*<span class="meta-stat-value">([\\s\\S]*?)</span>'
  + '\\s*<span class="meta-stat-name">\\s*Region\\s*</span>', 'i')

const BASE = 'https://adamlaycock.ca/'
const CONTENT_INDEX = `${BASE}static/contentIndex.json`

interface Entry {
  readonly title?: string
  readonly tags?: readonly string[]
}

/** The route's own Region property, or undefined when the page omits it. */
async function regionOf(fetchText: Fetcher, url: string): Promise<string | undefined> {
  const html = await fetchText(url).catch(() => undefined)
  if (html === undefined) return undefined
  const region = REGION_PROPERTY.exec(html)?.[1]
  return region ? matchArea(textOf(region)) : undefined
}

export async function scrapeAdamLaycock(fetchText: Fetcher): Promise<RawReport[]> {
  const index = JSON.parse(await fetchText(CONTENT_INDEX)) as Record<string, Entry>
  const routes = Object.entries(index)
    .filter(([slug, entry]) => slug.startsWith('Routes/') && entry.title)

  const reports: RawReport[] = []
  for (const [slug, entry] of routes) {
    const title = decodeEntities(entry.title!).trim()
    const url = new URL(slug, BASE).href
    reports.push({
      sourceId: 'adamlaycock',
      title,
      url,
      objectives: splitObjectives(title),
      sourceRegion: await regionOf(fetchText, url)
    })
  }
  return reports
}
