/**
 * bobspirko.ca — hand-written HTML, one page per trip, indexed by category.
 *
 * Region comes from the URL path where the path has one, and from the report
 * itself where it does not. Every page heads its title with a locality line —
 * "Kananaskis, Alberta", "Castle Provincial Park Alberta", "Kootenay Park,
 * B.C." — sitting between the title and the date, which settles the pages filed
 * directly under a category with no region folder, and the "NugaraScrambles"
 * ones below. That costs one request per such report, once, against the cache.
 *
 * Region comes from the URL path. Path segments that describe the *kind* of
 * outing rather than where it is ("Hiking", "Snowshoe", "OtherScrambles") are
 * skipped, so `/Hiking/Kananaskis/CoxHill/CoxHill.html` yields "Kananaskis".
 * "NugaraScrambles" survives that filter but is intentionally absent from the
 * region map: it is a guidebook grouping spanning four regions, so those
 * objectives inherit a region from another source instead.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import { anchors, textOf } from '../html.ts'
import { splitObjectives } from '../canon.ts'
import { matchArea } from '../areas.ts'
import { REGION_MAP } from '../regions.ts'

const BASE = 'http://bobspirko.ca/'

/** Category indexes. Every trip is reachable from one of these. */
const INDEXES = [
  'OtherScrambles/canada.html',
  'Hiking/Hiking.htm',
  'Snowshoe/Snowshoe.htm',
  'USTrips/UStrips.htm'
]

/** Link texts that are navigation rather than a trip. */
const NAVIGATION = /^(home|map|about|articles?|archive|bio|index|top)$/i

/** Path segments that classify the outing rather than locate it. */
const NON_REGION = new Set(['Hiking', 'Snowshoe', 'OtherScrambles', 'USTrips', 'Misc'])

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'

/** Everything between the report's heading and its date; the locality is last. */
const HEADER_BLOCK = new RegExp(`class="heading"[\\s\\S]{0,600}?(?=(?:${MONTHS})\\s+\\d{1,2},\\s*\\d{4})`, 'i')

/**
 * The locality line from a report's own header.
 *
 * The header runs title, locality, date, each separated by a `<br>`, so the
 * locality is the last non-empty line before the date. A parenthetical
 * alternative name sometimes follows the title ("Storm Mountain North Ridge
 * (aka Vista Peak)") and is dropped with it.
 */
function localityOf(html: string): string | undefined {
  const block = HEADER_BLOCK.exec(html)?.[0]
  if (!block) return undefined
  // The whole tag is consumed, not just its name: splitting on "<br" alone
  // leaves a "/>" fragment that survives textOf and looks like a line.
  const lines = block.split(/<br\s*\/?>/i).map(textOf).filter(Boolean)
  // The last line is returned even when it is the only one: a few reports run
  // the title and locality together ("Buller North Ridge Kananaskis, Alberta")
  // with no break between them, and matchArea only fires on a place word, so
  // reading a title that contains none costs nothing.
  return lines[lines.length - 1]
}

function regionFromPath(url: URL): string | undefined {
  const segments = url.pathname.split('/').filter(Boolean)
  const region = segments.find(segment => !NON_REGION.has(segment) && !/\.html?$/i.test(segment))
  return region
}

/**
 * The path's region when we recognise it, else the one the report states. A
 * path segment we do not map is either a trip folder with no region above it or
 * "NugaraScrambles", a guidebook grouping spanning four regions — both cases
 * the report's own header answers.
 */
async function regionOf(url: URL, fetchText: Fetcher): Promise<string | undefined> {
  const fromPath = regionFromPath(url)
  if (fromPath && REGION_MAP.spirko?.[fromPath]) return fromPath

  const html = await fetchText(url.href).catch(() => undefined)
  const locality = html ? localityOf(html) : undefined
  return (locality ? matchArea(locality) : undefined) ?? fromPath
}

export async function scrapeSpirko(fetchText: Fetcher): Promise<RawReport[]> {
  const reports = new Map<string, RawReport>()

  for (const index of INDEXES) {
    const indexUrl = new URL(index, BASE)
    for (const anchor of anchors(await fetchText(indexUrl.href))) {
      if (anchor.attrs.includes('topline')) continue
      if (!/\.html?$/i.test(anchor.href) || !anchor.text) continue
      if (NAVIGATION.test(anchor.text)) continue

      const url = new URL(anchor.href, indexUrl)
      if (url.hostname !== 'bobspirko.ca') continue
      if (/\/(map|archive|articles|bio|about)\b/i.test(url.pathname)) continue

      // The same trip is listed under several indexes; first listing wins.
      if (reports.has(url.href)) continue
      reports.set(url.href, {
        sourceId: 'spirko',
        title: anchor.text,
        url: url.href,
        objectives: splitObjectives(anchor.text),
        sourceRegion: await regionOf(url, fetchText)
      })
    }
  }
  return [...reports.values()]
}
