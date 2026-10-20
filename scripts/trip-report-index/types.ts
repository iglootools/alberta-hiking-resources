/**
 * Shared vocabulary for the trip-report index builder.
 *
 * A `RawReport` is what a source adapter scrapes: one published trip report,
 * naming one or more objectives. An `Objective` is what the renderer emits: one
 * mountain/summit with every report that covers it, from every source.
 */

import type { GuidebookEntry } from './guidebooks.ts'

/** A source blog, as credited in the generated pages. */
export interface Source {
  readonly id: string
  readonly label: string
  readonly home: string
}

/** One trip report, as scraped from a single source. */
export interface RawReport {
  readonly sourceId: string
  /** The report's own title, shown when it differs from the objective name. */
  readonly title: string
  readonly url: string
  /**
   * Objective names this report covers, primary first. A combined trip like
   * "Aldridge, Mount (+ Courcelette, Fording)" yields three.
   */
  readonly objectives: readonly string[]
  /** The source's own region label, before mapping onto our taxonomy. */
  readonly sourceRegion?: string
  /** A finer locality the source published, e.g. Explor8ion's "High Rock Range". */
  readonly subRange?: string
  /**
   * Other reports by the same author that this one links to, as absolute URLs.
   * Read from blogs that publish no region, where a report's links to its
   * neighbours are the best evidence of where it is (see inference.ts).
   */
  readonly relatedUrls?: readonly string[]
  /** Where the report says the trip starts, for a blog that maps its trailheads. */
  readonly trailhead?: Coordinates
}

export interface Coordinates {
  readonly lat: number
  readonly lon: number
}

/**
 * Why an objective is listed under a region. Every claim records the signal
 * behind it, so a page can show the reader where the signals agree and where
 * they do not, instead of only the region that won.
 *
 * The first three are *stated*: a blog, a person or a tick-list says so. The
 * rest are *inferred* by this script from evidence that is not itself a region,
 * and are shown as such. A *weak* inference is one whose evidence is thin or
 * split; it is only used for an objective nothing else places (see
 * inference.ts).
 */
export type Signal
  = | { readonly kind: 'stated', readonly sourceId: string }
    | { readonly kind: 'curated' }
    | { readonly kind: 'tick-list' }
    | { readonly kind: 'sub-range', readonly sourceId: string, readonly subRange: string }
    /** `agreeing` of the `total` placed reports this one links to are in the region. */
    | { readonly kind: 'linked', readonly sourceId: string, readonly agreeing: number, readonly total: number, readonly weak?: true }
    /** `agreeing` of the `total` placed objectives that share a report with this one are in the region. */
    | { readonly kind: 'companion', readonly sourceId: string, readonly agreeing: number, readonly total: number, readonly weak?: true }
    | { readonly kind: 'trailhead', readonly sourceId: string, readonly weak?: true }
    /** The objective's name, found on the map, among objectives placed in the region. */
    | { readonly kind: 'named-place', readonly weak?: true }

export interface Claim {
  readonly regionId: string
  readonly signal: Signal
}

const STATED_KINDS: ReadonlySet<Signal['kind']> = new Set(['stated', 'curated', 'tick-list'])

export function isStated(claim: Claim): boolean {
  return STATED_KINDS.has(claim.signal.kind)
}

/** One objective with every report that covers it. */
export interface Objective {
  readonly key: string
  readonly name: string
  /**
   * Every region the objective is listed under, strongest claim first. Empty
   * for an objective nothing places, which goes on the catch-all page.
   */
  readonly claims: readonly Claim[]
  readonly subRange?: string
  readonly reports: readonly RawReport[]
  /** Guidebooks this objective appears in, with the book's own grade. */
  readonly guidebooks?: readonly GuidebookEntry[]
}
