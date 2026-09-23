/**
 * on-top.ca — a hand-built site with two indexes, "Up High (Summits)" and
 * "Down Low (Hikes)", each linking outings filed as Outings/<year>/<name>.html.
 *
 * The title carries a month and year that canon.ts does not strip, so it is
 * removed here before the name is read.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import { splitObjectives } from '../canon.ts'
import { anchors } from '../html.ts'

const BASE = 'https://www.on-top.ca/'
const INDEXES = ['Index-Summits.html', 'Index-Hikes.html']

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'
const TRAILING_DATE = new RegExp(`[\\s,-]+(?:${MONTHS})\\s*,?\\s*\\d{4}\\s*$`, 'i')

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
  return [...reports.values()]
}
