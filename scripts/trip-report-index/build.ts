/**
 * Folds every scraped report into the objective list the pages are rendered
 * from: group by canonical name, place each objective in a region, drop what is
 * out of scope, and set aside what could not be placed.
 */
import type { Objective, RawReport } from './types.ts'
import type { GuidebookIndex } from './guidebooks.ts'
import { ALIASES, REGION_OVERRIDES } from './curation.ts'
import { canonKey, displayName } from './canon.ts'
import { OUT_OF_SCOPE, REGION_IDS, isHomonym, mappedRegionOf, resolveRegion } from './regions.ts'
import { SOURCE_ORDER } from './sources/index.ts'

/**
 * Learns which region each sub-range belongs to from the objectives that are
 * already placed.
 *
 * Explor8ion publishes a sub-range ("Misty Range", "Opal Range") on every trip,
 * including the few dozen its region pages omit. Those ranges are the source's
 * own vocabulary, already tied to regions by the 800-odd trips that *are*
 * listed, so the mapping is read off the data rather than written by hand — no
 * curation entry, and it follows the source if they re-file a range.
 *
 * A range spanning two regions is awarded to the one holding more of it.
 */
function learnSubRanges(placed: Iterable<Objective>): Map<string, string> {
  const tally = new Map<string, Map<string, number>>()
  for (const objective of placed) {
    if (!objective.subRange) continue
    if (!tally.has(objective.subRange)) tally.set(objective.subRange, new Map())
    const counts = tally.get(objective.subRange)!
    counts.set(objective.regionId, (counts.get(objective.regionId) ?? 0) + 1)
  }

  const learned = new Map<string, string>()
  for (const [subRange, counts] of tally) {
    const [best] = [...counts].sort((left, right) => right[1] - left[1])
    if (best) learned.set(subRange, best[0])
  }
  return learned
}

export interface BuildResult {
  readonly byRegion: ReadonlyMap<string, readonly Objective[]>
  /** Objectives no source placed and no override covers. Input to curation. */
  readonly unplaced: readonly Objective[]
  /** Objectives whose sources disagreed on region, with the ranking applied. */
  readonly conflicts: readonly { objective: Objective, conflicts: readonly string[] }[]
  readonly outOfScopeCount: number
}

/** Applies a curated alias so both spellings collapse onto one objective. */
function keyOf(name: string): string {
  const key = canonKey(name)
  return ALIASES[key] ?? key
}

function groupByObjective(reports: readonly RawReport[]): Map<string, RawReport[]> {
  const groups = new Map<string, RawReport[]>()
  for (const report of reports) {
    for (const objective of report.objectives) {
      const key = keyOf(objective)
      if (!key) continue
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(report)
    }
  }
  return groups
}

const sourceRank = (sourceId: string) => {
  const index = SOURCE_ORDER.indexOf(sourceId)
  return index === -1 ? SOURCE_ORDER.length : index
}

/**
 * The name to print. Sources spell the same peak differently, so the one from
 * the highest-priority source wins, after `displayName` has un-inverted it. The
 * name is looked for among the objectives that produced this key, so a combined
 * trip contributes "Courcelette", not its whole title.
 */
function pickName(key: string, reports: readonly RawReport[]): string {
  const candidates = reports
    .flatMap(report => report.objectives.map(objective => ({ report, objective })))
    .filter(candidate => keyOf(candidate.objective) === key)
    .sort((left, right) => sourceRank(left.report.sourceId) - sourceRank(right.report.sourceId))
  return displayName(candidates[0]?.objective ?? key)
}

function sortReports(reports: readonly RawReport[]): RawReport[] {
  return [...new Map(reports.map(report => [report.url, report])).values()]
    .sort((left, right) => sourceRank(left.sourceId) - sourceRank(right.sourceId)
      || left.title.localeCompare(right.title))
}

function byName(left: Objective, right: Objective): number {
  return left.name.localeCompare(right.name, 'en')
}

/**
 * Splits a shared name back into one objective per mountain.
 *
 * Reports go to the region their own source filed them under; the ones whose
 * source named no region stay with the winning partition, since there is
 * nothing better to go on. Both peaks keep the name — they are on different
 * pages, which is the disambiguation.
 */
function splitHomonym(group: readonly RawReport[], fallbackRegion: string): Map<string, RawReport[]> {
  const partitions = new Map<string, RawReport[]>()
  const unplaced: RawReport[] = []

  for (const report of group) {
    const mapped = mappedRegionOf(report)
    if (!mapped || mapped === OUT_OF_SCOPE) {
      unplaced.push(report)
      continue
    }
    if (!partitions.has(mapped)) partitions.set(mapped, [])
    partitions.get(mapped)!.push(report)
  }
  if (partitions.has(fallbackRegion)) partitions.get(fallbackRegion)!.push(...unplaced)
  return partitions
}

/**
 * `guidebooks` is optional so the builder can be exercised without fetching the
 * lists. When present it does two jobs: it annotates objectives with the books
 * they appear in, and its Region column places objectives no blog places.
 */
export function buildObjectives(
  reports: readonly RawReport[],
  guidebooks?: GuidebookIndex
): BuildResult {
  const byRegion = new Map<string, Objective[]>()
  const unplaced: Objective[] = []
  const conflicts: { objective: Objective, conflicts: readonly string[] }[] = []
  let outOfScopeCount = 0

  for (const [key, group] of groupByObjective(reports)) {
    const resolution = resolveRegion(group)
    const overridden = REGION_OVERRIDES[key]

    // A curated override outranks the sources, because it is only ever reached
    // for objectives they failed to place — and it may say the objective is not
    // ours to list at all.
    if (overridden === OUT_OF_SCOPE) {
      outOfScopeCount += 1
      continue
    }
    // A curated entry outranks the sources. It is usually reached only because
    // they placed nothing, but it also has to win outright: Steven Song files
    // the whole Selkirk range under one heading, so the only way to separate
    // Rogers Pass from the Kokanee Glacier 200 km south is to say so by hand.
    // A guidebook's own Region column ranks below the blogs and below curation,
    // but above giving up: it is the book's filing, not a guess at one.
    const regionId = overridden ?? resolution.regionId ?? guidebooks?.regions.get(key)
    if (!regionId && resolution.outOfScope) {
      outOfScopeCount += 1
      continue
    }

    const objective: Objective = {
      key,
      name: pickName(key, group),
      regionId: regionId ?? '',
      subRange: group.find(report => report.subRange)?.subRange,
      reports: sortReports(group),
      guidebooks: guidebooks?.entries.get(key)
    }

    if (!regionId) {
      unplaced.push(objective)
      continue
    }
    if (!REGION_IDS.has(regionId)) {
      throw new Error(`Objective "${objective.name}" resolved to unknown region "${regionId}"`)
    }
    if (resolution.conflicts.length > 0) conflicts.push({ objective, conflicts: resolution.conflicts })

    // Two mountains sharing a name become two objectives, one per region.
    const partitions = isHomonym(group)
      ? splitHomonym(group, regionId)
      : new Map([[regionId, [...group]]])

    for (const [partitionRegion, partitionReports] of partitions) {
      if (!REGION_IDS.has(partitionRegion)) continue
      if (!byRegion.has(partitionRegion)) byRegion.set(partitionRegion, [])
      byRegion.get(partitionRegion)!.push({
        ...objective,
        regionId: partitionRegion,
        subRange: partitionReports.find(report => report.subRange)?.subRange,
        reports: sortReports(partitionReports)
      })
    }
  }

  // Second pass: place what is left using sub-ranges learned from the first.
  const learned = learnSubRanges([...byRegion.values()].flat())
  const stillUnplaced: Objective[] = []
  for (const objective of unplaced) {
    const regionId = objective.subRange ? learned.get(objective.subRange) : undefined
    if (!regionId) {
      stillUnplaced.push(objective)
      continue
    }
    byRegion.get(regionId)!.push({ ...objective, regionId })
  }

  for (const objectives of byRegion.values()) objectives.sort(byName)
  return {
    byRegion,
    unplaced: stillUnplaced.sort(byName),
    conflicts,
    outOfScopeCount
  }
}
