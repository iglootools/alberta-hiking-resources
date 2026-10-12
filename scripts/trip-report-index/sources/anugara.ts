/**
 * anugara.net — Andrew Nugara's trip log: one flat page, each entry an anchor
 * followed by its date, with no headings or table to group them.
 *
 * Only links back to anugara.net are taken. The log also points at 30-odd
 * peaksandstreams.com posts, which are someone else's reports and are indexed
 * under that source instead; crediting them here would attribute another
 * author's write-up to Nugara.
 *
 * The log states no region, and neither does any report. What the reports do
 * have is links to his reports of neighbouring peaks — Middle Sister links The
 * Orphan, Wind Ridge and Lougheed — so each report is read once for those, and
 * inference.ts lets the linked reports that other blogs place vote on where
 * this one is. Checked against reports that other blogs do place, the vote is
 * right 94% of the time at the threshold used there.
 */
import type { Fetcher } from '../fetch.ts'
import { fetchUnlessStatus } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import { splitObjectives } from '../canon.ts'
import { anchors } from '../html.ts'

const LOG = 'https://anugara.net/log.html'

/** Navigation and index pages rather than a trip. */
const NOT_A_TRIP = /^(home|log|index|links|about|contact|books?|gallery|photos?|here|this|more|page)$/i

/**
 * A repeat visit, numbered: "Commonwealth Ridge II", "Prairie Bluff XXI". He
 * returns to favourites dozens of times, so the numerals run well past X and
 * the pattern matches any roman numeral. The peak is the same one either way,
 * so the numeral is dropped and the visit merges with the first.
 */
const REPEAT_VISIT = /\s+(?=[MDCLXVI])M*(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})\.?$/

/** Outcome words appended to a name: "Jeri attempt", "Clougarvan Peak recon.", "GR380492 again(!)". */
const OUTCOME = /\s+(?:climb\s+)?(?:attempt|recon\.?|reconnaissance|try|scouting|exploration|again(?:\s*\(!\))?)\.?$/i

/**
 * Where the route rather than the objective starts: "Mount Baldy XV: West Peak
 * via Northwest Ridge", "Prairie Fire IV - "Sleeping Princess" route". A dash
 * only counts with spaces round it, so "Smith-Dorrien" is left alone.
 */
const ROUTE_QUALIFIER = /\s*:\s+|\s+[-–—]\s+/

/**
 * Between the objectives of one day: "Middle Sister II and The Orphan",
 * "Maverick Hill, Poker Peak III, Ginger Hill", "Citadel Peak, Fatigue
 * Mountain, and "Little Fatigue"". Across all 1,100 titles in the log, neither
 * a comma nor " and " is ever part of one peak's name — he does not invert names
 * the way Bob Spirko does — so both are split on.
 */
const BETWEEN_OBJECTIVES = /\s*,\s*(?:and\s+)?|\s+and\s+/

/** His quotes mark an unofficial name, and would otherwise straddle a split: `"Table Top Peak II and Whistable II"`. */
const QUOTES = /["“”]/g

/**
 * His parentheses describe rather than name — "(between Collier and Popes
 * Peak)", "(via climbing route, …)" — and their commas and "and"s are not
 * between objectives.
 */
const ASIDE = /\s*\([^)]*\)?/g

/** What a repeat-visit numeral leaves when it was the whole name: a "part II" link. */
const BARE_NUMERAL = /^[IVXLC]+$/

/**
 * What is left of a split that is not an objective: "beyond", "a little
 * beyond", "the Northeast End of Loaf Mountain" (all lower case), and the
 * bare direction or generic left by "Vimy Peak and Ridge" or "Pincher Ridge
 * Centre III, Southwest II".
 */
function isNotAnObjective(name: string): boolean {
  return /^[a-z]/.test(name)
    || /^(?:north|south|east|west|centre|center|northeast|northwest|southeast|southwest|ridges?|ridge\(s\)|peaks?|summit)$/i.test(name)
}

/** Roman numerals and short codes used as "part II" links rather than a name. */
const NOT_A_NAME = /^(?:[IVXLC]+|[A-Z]{1,3}\d*)$/

const HOST = 'anugara.net'

/** A link to one of his reports: same site, an .htm(l) page, not the log or index. */
function isReportUrl(url: URL): boolean {
  return url.hostname === HOST
    && /\.html?$/i.test(url.pathname)
    && !/\/(log|index)\.html?$/i.test(url.pathname)
}

/** The other reports a report links to, as absolute URLs, each once. */
export function relatedLinks(html: string, pageUrl: string): string[] {
  const related = new Set<string>()
  for (const anchor of anchors(html)) {
    let url: URL
    try {
      url = new URL(anchor.href, pageUrl)
    } catch {
      continue
    }
    url.hash = ''
    if (isReportUrl(url) && url.href !== pageUrl) related.add(url.href)
  }
  return [...related]
}

/** Removes the repeat-visit numeral and the outcome word, as often as they are stacked. */
function clean(objective: string): string {
  let name = objective.trim()
  for (;;) {
    const next = name.replace(OUTCOME, '').replace(REPEAT_VISIT, '').trim()
    if (next === name || !next) break
    name = next
  }
  return name
}

/**
 * The objectives one title names, each without its visit number, so a tenth
 * ascent is indexed under the same peak as the first.
 */
export function objectivesOf(title: string): string[] {
  const [objectives = ''] = title.replace(QUOTES, '').replace(ASIDE, '').split(ROUTE_QUALIFIER)
  return objectives
    .split(BETWEEN_OBJECTIVES)
    .flatMap(splitObjectives)
    .map(clean)
    .filter(name => name && !isNotAnObjective(name) && !BARE_NUMERAL.test(name))
}

export async function scrapeAnugara(fetchText: Fetcher): Promise<RawReport[]> {
  const reports = new Map<string, RawReport>()

  for (const anchor of anchors(await fetchText(LOG))) {
    if (!anchor.text || NOT_A_TRIP.test(anchor.text)) continue
    if (anchor.text.length < 4 || NOT_A_NAME.test(anchor.text)) continue
    if (!/\.html?$/i.test(anchor.href)) continue

    const url = new URL(anchor.href, LOG)
    if (!isReportUrl(url) || reports.has(url.href)) continue

    reports.set(url.href, {
      sourceId: 'anugara',
      title: anchor.text,
      url: url.href,
      objectives: objectivesOf(anchor.text)
    })
  }
  return withRelatedLinks([...reports.values()], fetchText)
}

/**
 * Reads each report for its links. A dead link is a fact about the site and
 * leaves the report without them; any other failure stops the run.
 */
async function withRelatedLinks(reports: readonly RawReport[], fetchText: Fetcher): Promise<RawReport[]> {
  const read: RawReport[] = []
  for (const report of reports) {
    const html = await fetchUnlessStatus(fetchText, report.url, 404)
    read.push(html ? { ...report, relatedUrls: relatedLinks(html, report.url) } : report)
  }
  return read
}
