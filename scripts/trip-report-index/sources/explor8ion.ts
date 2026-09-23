/**
 * explor8ion.com — a curated archive with a region page per area, each listing
 * every trip in it with a title and a sub-range.
 *
 * The region pages are the richest source here, so they are read in preference
 * to the sitemap. A few dozen trips appear in the sitemap but on no region page;
 * those are kept, without a region, and inherit one from another source.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import { anchors, decodeEntities, sitemapLocations, textOf } from '../html.ts'
import { splitObjectives } from '../canon.ts'

const BASE = 'https://explor8ion.com/'
const SITEMAP = `${BASE}sitemap-0.xml`
const REGIONS_INDEX = `${BASE}regions/`

/** `<a class="title" href="/trips/…">Name</a><p class="where">Aug 28, High Rock Range</p>` */
const TRIP_ENTRY = /<a\s+class="title"\s+href="(\/trips\/[^"]+\/)"[^>]*>([\s\S]*?)<\/a>\s*(?:<p class="where">([\s\S]*?)<\/p>)?/gi

/**
 * The standfirst on a trip page — "July 4, 2007, Misty Range Summit 2912 m" —
 * which carries the same sub-range the region pages print. It is the only
 * locality a trip page states, so it is what places the few dozen trips the
 * region pages omit.
 */
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'
const STANDFIRST = new RegExp(`(?:${MONTHS})\\s+\\d{1,2},\\s*\\d{4},\\s*([A-Z][^]{0,48}?)\\s+(?:Summit|Gain|Distance|Elevation|Round)`)

/**
 * The `where` field leads with a date; only what follows it is a place. Empty
 * parts are dropped after the date is removed, not before, so that a value
 * supplied with no date (`", Misty Range"`, from a trip page) parses the same
 * way as one from a region page (`"Aug 28, High Rock Range"`).
 */
/**
 * The site marks its own favourites with `<span class="fav">★</span>` appended
 * inside the `where` paragraph. Flattening that to text turns "Bow Range" into
 * "Bow Range ★", so the marker is removed before the range is read. It is real
 * information — the author's pick — and could be surfaced separately, but it is
 * not part of the range's name.
 */
const FAVOURITE_MARK = /<span\s+class="fav"[^>]*>[\s\S]*?<\/span>/gi

function subRangeOf(where: string | undefined): string | undefined {
  const parts = (where ?? '').split(',').map(part => part.trim())
  const range = parts.slice(1).filter(Boolean).join(', ')
  return range || undefined
}

function toReport(title: string, href: string, region: string | undefined, where?: string): RawReport {
  return {
    sourceId: 'explor8ion',
    title,
    url: new URL(href, BASE).href,
    objectives: splitObjectives(title),
    sourceRegion: region,
    subRange: subRangeOf(where)
  }
}

async function regionSlugs(fetchText: Fetcher): Promise<string[]> {
  const slugs = new Set<string>()
  for (const anchor of anchors(await fetchText(REGIONS_INDEX))) {
    const match = /\/regions\/([^/]+)\/?$/.exec(new URL(anchor.href, BASE).pathname)
    if (match) slugs.add(match[1]!)
  }
  return [...slugs]
}

export async function scrapeExplor8ion(fetchText: Fetcher): Promise<RawReport[]> {
  const reports = new Map<string, RawReport>()

  for (const slug of await regionSlugs(fetchText)) {
    const html = await fetchText(`${BASE}regions/${slug}/`)
    for (const match of html.matchAll(TRIP_ENTRY)) {
      const where = (match[3] ?? '').replace(FAVOURITE_MARK, '')
      const report = toReport(textOf(match[2] ?? ''), match[1]!, slug, textOf(where))
      if (report.title) reports.set(report.url, report)
    }
  }

  // Trips the region pages omit. Their title comes from the slug, which is the
  // same inverted style as the titles, so canon.ts handles it unchanged.
  for (const location of sitemapLocations(await fetchText(SITEMAP))) {
    const url = new URL(decodeEntities(location))
    if (!url.pathname.startsWith('/trips/') || url.pathname === '/trips/') continue
    if (reports.has(url.href)) continue
    const slug = url.pathname.replace(/^\/trips\/|\/$/g, '')
    if (/^\d+$/.test(slug)) continue // untitled numeric stubs
    const where = await rangeOf(fetchText, url.href)
    reports.set(url.href, toReport(titleFromSlug(slug), url.pathname, undefined, where))
  }
  return [...reports.values()]
}

/**
 * Reads the sub-range off a trip page, formatted as the `where` field is so it
 * flows through the same parsing. Returns undefined when the standfirst names
 * no range, which happens on the handful of articles among the trips.
 */
async function rangeOf(fetchText: Fetcher, url: string): Promise<string | undefined> {
  const html = await fetchText(url).catch(() => undefined)
  if (html === undefined) return undefined
  const range = STANDFIRST.exec(textOf(html))?.[1]?.trim()
  return range ? `, ${range}` : undefined
}

function titleFromSlug(slug: string): string {
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}
