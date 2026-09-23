/**
 * sonnybou.ca — a FrontPage-era sortable table, one row per summit, and the
 * single largest index of the lot.
 *
 * The table carries a LOCATION column ("Waterton Lakes National Park, AB",
 * "Allison Creek, AB") which resolves through the shared matcher, so this source
 * places most of its own objectives rather than inheriting them. Names use the
 * same inverted style as Bob Spirko ("Alderson, Mount"), which canon.ts already
 * handles.
 *
 * The page is ISO-8859-1 and says so only in a meta tag; fetch.ts reads that.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import { splitObjectives } from '../canon.ts'
import { matchArea } from '../areas.ts'
import { decodeEntities, textOf } from '../html.ts'

const INDEX = 'https://sonnybou.ca/scrambles/'

/** `<tr>` … `<td>` cells, with the anchor kept so the link survives. */
const ROW = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
const CELL = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
const LINK = /<a\s[^>]*href=["']?([^"'\s>]+)/i

/**
 * This archive reaches well past the Rockies — Nevada, Idaho, New Hampshire,
 * Poland. LOCATION ends in a province or state, so anything outside Alberta and
 * BC is dropped here rather than arriving as an objective with no region, the
 * same way Steven Song and Golden Scrambles are filtered. Glacier National Park
 * in Montana is the one exception the site covers and this one does too.
 */
const IN_SCOPE_JURISDICTION = /,\s*(?:AB|BC)$|glacier national park,?\s*MT/i

export async function scrapeSonnyBou(fetchText: Fetcher): Promise<RawReport[]> {
  const html = await fetchText(INDEX)
  const reports = new Map<string, RawReport>()

  for (const row of html.matchAll(ROW)) {
    const cells = [...(row[1] ?? '').matchAll(CELL)].map(cell => cell[1] ?? '')
    const [summit, location] = cells
    if (!summit || !location) continue

    const href = LINK.exec(summit)?.[1]
    const title = textOf(summit)
    if (!href || !title || title.toUpperCase() === 'SUMMIT') continue

    const where = textOf(location)
    if (!IN_SCOPE_JURISDICTION.test(where)) continue

    const url = new URL(decodeEntities(href), INDEX)
    if (url.hostname !== 'sonnybou.ca') continue
    if (reports.has(url.href)) continue

    reports.set(url.href, {
      sourceId: 'sonnybou',
      title,
      url: url.href,
      objectives: splitObjectives(title),
      sourceRegion: matchArea(where)
    })
  }
  return [...reports.values()]
}
