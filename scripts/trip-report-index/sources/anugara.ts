/**
 * anugara.net — Andrew Nugara's trip log: one flat page, each entry an anchor
 * followed by its date, with no headings or table to group them.
 *
 * Only links back to anugara.net are taken. The log also points at 30-odd
 * peaksandstreams.com posts, which are someone else's reports and are indexed
 * under that source instead; crediting them here would attribute another
 * author's write-up to Nugara.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import { splitObjectives } from '../canon.ts'
import { anchors } from '../html.ts'

const LOG = 'https://anugara.net/log.html'

/** Navigation and index pages rather than a trip. */
const NOT_A_TRIP = /^(home|log|index|links|about|contact|books?|gallery|photos?|here|this|more|page)$/i

/**
 * A repeat visit, numbered: "Commonwealth Ridge II", "Prairie Bluff XXI". He
 * returns to favourites dozens of times, so the numerals run well past X and
 * the pattern matches any roman numeral. The peak is the same one either way.
 */
const REPEAT_VISIT = /\s+(?=[MDCLXVI])M*(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})\.?$/

/** Outcome words appended to a name: "\"Jeri\" attempt", "\"Clougarvan Peak\" recon." */
const OUTCOME = /\s+(?:climb\s+)?(?:attempt|recon\.?|reconnaissance|try|scouting)\.?$/i

/**
 * Two objectives in one day, each quoted: `"Gilligan Peak" and "Skogan Peak"`.
 * Splitting only when both sides are quoted keeps names like "Jack and Jill"
 * whole, which a bare " and " would not.
 */
const QUOTED_PAIR = /"\s+and\s+"/

/** Roman numerals and short codes used as "part II" links rather than a name. */
const NOT_A_NAME = /^(?:[IVXLC]+|[A-Z]{1,3}\d*)$/

/** Removes the repeat-visit numeral and the outcome word, then the quotes. */
function clean(objective: string): string {
  let name = objective.trim()
  for (;;) {
    const next = name.replace(OUTCOME, '').replace(REPEAT_VISIT, '').trim()
    if (next === name || !next) break
    name = next
  }
  return name
}

export async function scrapeAnugara(fetchText: Fetcher): Promise<RawReport[]> {
  const reports = new Map<string, RawReport>()

  for (const anchor of anchors(await fetchText(LOG))) {
    if (!anchor.text || NOT_A_TRIP.test(anchor.text)) continue
    if (anchor.text.length < 4 || NOT_A_NAME.test(anchor.text)) continue
    if (!/\.html?$/i.test(anchor.href)) continue

    const url = new URL(anchor.href, LOG)
    if (url.hostname !== 'anugara.net') continue
    if (/\/(log|index)\.html?$/i.test(url.pathname)) continue
    if (reports.has(url.href)) continue

    reports.set(url.href, {
      sourceId: 'anugara',
      title: anchor.text,
      url: url.href,
      objectives: QUOTED_PAIR.test(anchor.text)
        ? anchor.text.split(/\s+and\s+/).flatMap(splitObjectives).map(clean).filter(Boolean)
        : splitObjectives(anchor.text).map(clean).filter(Boolean)
    })
  }
  return [...reports.values()]
}
