/**
 * goldenscrambles.ca — an old hand-built site, windows-1252 encoded, whose
 * region index is a clickable image map. The `<area>` elements are the only
 * machine-readable region listing it has, and they carry the region's slug in
 * the link, so they serve as both the link list and the region source.
 *
 * The image map covers the Rockies and Kootenays but not Rogers Pass, and the
 * alphabetical log holds around 190 summits no region page lists — Rogers Pass
 * peaks mixed in with Colorado 14ers and Aconcagua. Those summit pages each
 * carry an `area:` field naming a town and jurisdiction ("Rogers Pass,BC",
 * "Leadville,Colorado,USA"), so they are fetched individually and placed from
 * it. That costs one request per unlisted summit, once, against the cache.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import { anchors, decodeEntities, textOf } from '../html.ts'
import { splitObjectives } from '../canon.ts'
import { matchArea } from '../areas.ts'

const BASE = 'http://goldenscrambles.ca/'
const REGIONS_MAP = `${BASE}regions.html`
const ALPHABETICAL = `${BASE}alphalog.html`

const AREA_LINK = /<area\b[^>]*\bhref="([^"]*\/regions\/([^"/]+)\.html)"[^>]*>/gi

/** The summit page's own locality, between the `area:` and `map` labels. */
const AREA_FIELD = /area:\s*(.+?)\s+map\b/i

/**
 * Jurisdictions worth reading. Anything else — Colorado, California, Nevada,
 * Arizona, Yukon, Argentina — is dropped here rather than mapped, so foreign
 * summits never reach the curation list. Prefixing with `area:` keeps these
 * values from colliding with the image map's slugs in REGION_MAP.
 */
const IN_SCOPE_JURISDICTION = /,\s*(AB|BC)$|Montana/i

function isSummitLink(href: string): boolean {
  return /\/?summits\/[^/]+\/[^/]+\.html?$/i.test(href)
}

function toReport(text: string, url: URL, region: string | undefined): RawReport {
  return { sourceId: 'goldenscrambles', title: text, url: url.href, objectives: splitObjectives(text), sourceRegion: region }
}

/**
 * Reads `area:` off a summit page.
 *
 * `'foreign'` means the page named a jurisdiction we do not cover, and the
 * summit is dropped — the alphabetical log is roughly a third Colorado 14ers.
 * `undefined` means the page gave no usable answer at all (two 404s at the time
 * of writing), which leaves the summit for curation rather than discarding it.
 */
async function areaOf(fetchText: Fetcher, url: string): Promise<string | 'foreign' | undefined> {
  const html = await fetchText(url).catch(() => undefined)
  if (html === undefined) return undefined
  const area = AREA_FIELD.exec(textOf(html))?.[1]?.trim()
  if (!area) return undefined
  if (!IN_SCOPE_JURISDICTION.test(area)) return 'foreign'
  // The locality goes through the shared matcher, the same one Bob Spirko's
  // header line and Annie Ouellet's titles use, so one vocabulary covers all of
  // them. An `area:` key falls through to REGION_MAP for the handful it does
  // not recognise, which are out of scope rather than unknown.
  return matchArea(area) ?? `area:${area}`
}

async function fromRegionMap(fetchText: Fetcher): Promise<Map<string, RawReport>> {
  const reports = new Map<string, RawReport>()
  for (const match of (await fetchText(REGIONS_MAP)).matchAll(AREA_LINK)) {
    const html = await fetchText(new URL(decodeEntities(match[1]!), BASE).href)
    for (const anchor of anchors(html)) {
      if (!isSummitLink(anchor.href) || !anchor.text) continue
      const url = new URL(anchor.href, BASE)
      if (!reports.has(url.href)) reports.set(url.href, toReport(anchor.text, url, match[2]!))
    }
  }
  return reports
}

export async function scrapeGoldenScrambles(fetchText: Fetcher): Promise<RawReport[]> {
  const reports = await fromRegionMap(fetchText)

  for (const anchor of anchors(await fetchText(ALPHABETICAL))) {
    if (!isSummitLink(anchor.href) || !anchor.text) continue
    const url = new URL(anchor.href, BASE)
    if (reports.has(url.href)) continue
    const area = await areaOf(fetchText, url.href)
    if (area === 'foreign') continue
    reports.set(url.href, toReport(anchor.text, url, area))
  }
  return [...reports.values()]
}
