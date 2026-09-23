/**
 * List membership, from Adam Laycock's four published tick-lists.
 *
 * Three are guidebooks, which are not online, so there is nothing to link to
 * for "this is a Kane scramble". His list pages are the closest thing: one row
 * per objective, carrying the book's own grade, a region, and a link to his
 * page for that objective. That page is used as the link target, and a reader
 * who wants the route description goes to the book.
 *
 * The fourth, the 11,000ers, is not a book at all — it is the peaks over 11,000
 * feet, so there is no publication behind it and no grade to quote. It is
 * carried here anyway because it is the same shape of fact about an objective
 * and reaches the reader the same way, and because his page for the peak is the
 * best canonical reference available for one.
 *
 * The lists are also a placement signal — their Region column covers objectives
 * no blog places — and a completeness check: they are the clearest inventory of
 * what is in each book anywhere online.
 */
import type { Fetcher } from './fetch.ts'
import { canonKey, splitObjectives } from './canon.ts'
import { ALIASES } from './curation.ts'
import { matchArea } from './areas.ts'
import { decodeEntities, textOf } from './html.ts'

const BASE = 'https://adamlaycock.ca/Lists/'

interface ListSpec {
  readonly slug: string
  /** The label the mark is shown under. */
  readonly book: string
  /**
   * What to make of the second column, which every list has and no two agree
   * on: a grade for the guidebooks, an elevation in metres for the 11,000ers.
   * Reading it positionally is fine — the region is column three throughout —
   * but what it *means* has to be declared.
   */
  readonly mark: (cell: string) => string
  /**
   * Rows expected, well under today's count. A redesign that empties a list
   * would otherwise drop several hundred marks with the run still green, which
   * is the silent degradation the source adapters guard against the same way.
   */
  readonly minimumRows: number
}

const GRADE = (cell: string): string => cell

/** Metres, with a thousands separator; left alone if it is not a number. */
const METRES = (cell: string): string => {
  const metres = Number(cell.replace(/[\s,]/g, ''))
  return Number.isFinite(metres) ? `${metres.toLocaleString('en-CA')} m` : cell
}

const LISTS: readonly ListSpec[] = [
  { slug: '11000ers-of-the-Canadian-Rockies', book: '11,000ers', mark: METRES, minimumRows: 50 },
  { slug: 'Kane-Scrambles', book: 'Kane', mark: GRADE, minimumRows: 150 },
  { slug: 'Nugara-Scrambles', book: 'Nugara', mark: GRADE, minimumRows: 100 },
  { slug: 'Don%27t-waste-your-time', book: 'Don’t Waste Your Time', mark: GRADE, minimumRows: 120 }
]

const ROW = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
const CELL = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
const LINK = /href="([^"]+)"/i

export interface GuidebookEntry {
  /** "Kane", "Nugara", "Don't Waste Your Time", "11,000ers". */
  readonly book: string
  /**
   * What the list says about the objective: the book's own grade or verdict
   * ("Moderate", "Premiere", "Dont Do"), or an elevation for the 11,000ers.
   */
  readonly grade: string
  /** Adam Laycock's page for the objective, standing in for the book. */
  readonly url: string
}

export interface GuidebookIndex {
  /** Guidebook entries by canonical objective name. */
  readonly entries: ReadonlyMap<string, readonly GuidebookEntry[]>
  /** The region each list states, by canonical objective name. */
  readonly regions: ReadonlyMap<string, string>
}

/** Canonical key with the curated aliases applied, as the builder does. */
function keyOf(name: string): string {
  const key = canonKey(name)
  return ALIASES[key] ?? key
}

export async function readGuidebooks(fetchText: Fetcher): Promise<GuidebookIndex> {
  const entries = new Map<string, GuidebookEntry[]>()
  const regions = new Map<string, string>()

  for (const { slug, book, mark, minimumRows } of LISTS) {
    const html = await fetchText(`${BASE}${slug}`)
    let rows = 0
    for (const row of html.matchAll(ROW)) {
      const cells = [...(row[1] ?? '').matchAll(CELL)].map(cell => cell[1] ?? '')
      const [trip, grade, region] = cells
      if (!trip || !grade) continue

      const name = textOf(trip)
      const href = LINK.exec(trip)?.[1]
      // The header row has no link, which is also how it is skipped.
      if (!name || !href) continue

      rows += 1
      const entry: GuidebookEntry = {
        book,
        grade: mark(textOf(grade)),
        url: new URL(decodeEntities(href), `${BASE}${slug}`).href
      }
      const area = region ? matchArea(textOf(region)) : undefined

      // A list row can name several destinations ("Bourgeau Lake & Harvey
      // Pass"), split the same way a report title is so each one is marked.
      for (const objective of splitObjectives(name)) {
        const key = keyOf(objective)
        if (!key) continue
        if (!entries.has(key)) entries.set(key, [])
        entries.get(key)!.push(entry)
        if (area && !regions.has(key)) regions.set(key, area)
      }
    }
    if (rows < minimumRows) {
      throw new Error(
        `${slug} yielded ${rows} rows, expected at least ${minimumRows}. `
        + 'Fix the parser rather than lowering the minimum.'
      )
    }
  }
  return { entries, regions }
}
