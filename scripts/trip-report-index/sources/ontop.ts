/**
 * on-top.ca — a hand-built site with two indexes, "Up High (Summits)" and
 * "Down Low (Hikes)", each linking outings filed as Outings/<year>/<name>.html.
 *
 * The title carries a month and year that canon.ts does not strip, so it is
 * removed here before the name is read.
 *
 * Neither index states a region, but nearly every report links its trailhead or
 * parking on Google Maps (363 of 393 when this was written), and the link
 * carries coordinates. Each report is read once for them, and inference.ts
 * places the trailhead among the objectives other blogs place around it.
 */
import type { Fetcher } from '../fetch.ts'
import { fetchUnlessStatus } from '../fetch.ts'
import type { Coordinates, RawReport } from '../types.ts'
import { splitObjectives } from '../canon.ts'
import { anchors } from '../html.ts'

const BASE = 'https://www.on-top.ca/'
const INDEXES = ['Index-Summits.html', 'Index-Hikes.html']

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'
const TRAILING_DATE = new RegExp(`[\\s,-]+(?:${MONTHS})\\s*,?\\s*\\d{4}\\s*$`, 'i')

const MAPS_LINK = /href="(https?:\/\/(?:www\.)?google\.[a-z.]+\/maps[^"]*)"/gi

/**
 * Google writes a place's own position as `!3d<lat>!4d<lon>` and the viewport
 * centre as `@<lat>,<lon>`. The pin is the trailhead; the viewport is wherever
 * the map happened to be scrolled, so it is the fallback. The last pin wins
 * because a link with directions lists its origin first.
 */
function coordinatesOf(mapsUrl: string): Coordinates | undefined {
  const pin = [...mapsUrl.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)].at(-1)
  const hit = pin ?? /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(mapsUrl)
  return hit ? { lat: Number(hit[1]), lon: Number(hit[2]) } : undefined
}

/** The first Google Maps link on the page that carries a position. */
export function trailheadOf(html: string): Coordinates | undefined {
  for (const match of html.matchAll(MAPS_LINK)) {
    const position = coordinatesOf(match[1]!)
    if (position) return position
  }
  return undefined
}

export async function scrapeOnTop(fetchText: Fetcher): Promise<RawReport[]> {
  const reports = new Map<string, RawReport>()

  for (const index of INDEXES) {
    for (const anchor of anchors(await fetchText(new URL(index, BASE).href))) {
      if (!anchor.text || !/Outings\//i.test(anchor.href)) continue

      const url = new URL(anchor.href, BASE)
      if (url.hostname !== 'www.on-top.ca' || reports.has(url.href)) continue

      const title = anchor.text.replace(TRAILING_DATE, '').trim()
      if (!title) continue
      reports.set(url.href, {
        sourceId: 'ontop',
        title,
        url: url.href,
        objectives: splitObjectives(title)
      })
    }
  }
  return withTrailheads([...reports.values()], fetchText)
}

/** A dead link leaves the report without a trailhead; any other failure stops the run. */
async function withTrailheads(reports: readonly RawReport[], fetchText: Fetcher): Promise<RawReport[]> {
  const read: RawReport[] = []
  for (const report of reports) {
    const html = await fetchUnlessStatus(fetchText, report.url, 404)
    const trailhead = html ? trailheadOf(html) : undefined
    read.push(trailhead ? { ...report, trailhead } : report)
  }
  return read
}
