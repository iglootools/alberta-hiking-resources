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
}

/** One objective with every report that covers it. */
export interface Objective {
  readonly key: string
  readonly name: string
  readonly regionId: string
  readonly subRange?: string
  readonly reports: readonly RawReport[]
  /** Guidebooks this objective appears in, with the book's own grade. */
  readonly guidebooks?: readonly GuidebookEntry[]
}
