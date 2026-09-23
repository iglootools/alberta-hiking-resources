/**
 * Guidebook membership, from Adam Laycock's three published tick-lists.
 *
 * The books themselves are not online, so there is nothing to link to for
 * "this is a Kane scramble". His list pages are the closest thing: one row per
 * objective, carrying the book's own grade, a region, and a link to his page
 * for that objective. That page is used as the link target, and a reader who
 * wants the route description goes to the book.
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

/** The three lists, with the label each is shown under. */
const LISTS: readonly { readonly slug: string, readonly book: string }[] = [
  { slug: 'Kane-Scrambles', book: 'Kane' },
  { slug: 'Nugara-Scrambles', book: 'Nugara' },
  { slug: 'Don%27t-waste-your-time', book: 'Don’t Waste Your Time' }
]

const ROW = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
const CELL = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
const LINK = /href="([^"]+)"/i

export interface GuidebookEntry {
  /** "Kane", "Nugara", "Don't Waste Your Time". */
  readonly book: string
  /** The book's own grade or verdict: "Moderate", "Premiere", "Dont Do". */
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

  for (const { slug, book } of LISTS) {
    const html = await fetchText(`${BASE}${slug}`)
    for (const row of html.matchAll(ROW)) {
      const cells = [...(row[1] ?? '').matchAll(CELL)].map(cell => cell[1] ?? '')
      const [trip, grade, region] = cells
      if (!trip || !grade) continue

      const name = textOf(trip)
      const href = LINK.exec(trip)?.[1]
      // The header row has no link, which is also how it is skipped.
      if (!name || !href) continue

      const entry: GuidebookEntry = {
        book,
        grade: textOf(grade),
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
  }
  return { entries, regions }
}
