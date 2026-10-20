/**
 * Folds every scraped report into the objective list the pages are rendered
 * from: group by canonical name, collect every claim about where each objective
 * is, drop what is out of scope, and set aside what nothing places.
 *
 * An objective is listed under *every* region a signal names, not only the one
 * that wins. Bow Peak is filed under Banff by one blog and the Icefields
 * Parkway by two, and it is in both, on the boundary; a reader browsing either
 * should find it. Each claim keeps its signal so the page can say who says so.
 */
import type { Claim, Objective, RawReport, Signal } from './types.ts'
import type { GuidebookIndex } from './guidebooks.ts'
import type { Inferred } from './inference.ts'
import { REGION_OVERRIDES, REPORT_OBJECTIVES } from './curation.ts'
import { displayName, objectiveKey } from './canon.ts'
import { UnknownRegionError } from './errors.ts'
import { NOTHING_INFERRED } from './inference.ts'
import { OUT_OF_SCOPE, REGION_IDS, REGION_PRIORITY, isHomonym, mappedRegionOf, strongestStatedRegion } from './regions.ts'
import { SOURCE_ORDER } from './sources/index.ts'
import { isStated } from './types.ts'

/**
 * Why a name group was left off every page. A wrong exclusion is otherwise
 * invisible — the objective simply disappears — so each is kept for the
 * worksheet rather than only counted.
 *
 * - `curated`: REGION_OVERRIDES says out-of-scope.
 * - `filed-elsewhere`: a blog files it somewhere this site does not cover
 *   (`sourceIds`), and nothing stated places it here.
 * - `outside`: a trailhead or place-name position is far from every region.
 */
export interface Dropped {
  readonly key: string
  readonly name: string
  readonly reason: 'curated' | 'filed-elsewhere' | 'outside'
  readonly sourceIds: readonly string[]
  readonly url: string
}

export interface BuildResult {
  /** Every objective once, placed or not. */
  readonly objectives: readonly Objective[]
  /** Each region's objectives; an objective with claims on two regions is in both lists. */
  readonly byRegion: ReadonlyMap<string, readonly Objective[]>
  /** Objectives nothing places and no override covers. Input to curation. */
  readonly unplaced: readonly Objective[]
  /** Name groups left off every page as out of scope, with the reason. */
  readonly dropped: readonly Dropped[]
}

/** Applies a curated REPORT_OBJECTIVES entry in place of the title's own parse. */
function withCuratedObjectives(report: RawReport): RawReport {
  const objectives = REPORT_OBJECTIVES[report.url]
  return objectives ? { ...report, objectives } : report
}

function groupByObjective(reports: readonly RawReport[]): Map<string, RawReport[]> {
  const groups = new Map<string, RawReport[]>()
  for (const report of reports) {
    for (const objective of report.objectives) {
      const key = objectiveKey(objective)
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
    .filter(candidate => objectiveKey(candidate.objective) === key)
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

/** Strongest kind first; the stated kinds lead, and blogs rank among themselves as in REGION_PRIORITY. */
const KIND_RANK: Readonly<Record<Signal['kind'], number>> = {
  'curated': 0, 'stated': 1, 'tick-list': 2, 'sub-range': 3, 'companion': 4, 'linked': 5, 'trailhead': 6, 'named-place': 7
}

function claimRank(claim: Claim): [number, number] {
  const sourceId = 'sourceId' in claim.signal ? claim.signal.sourceId : ''
  const priority = REGION_PRIORITY.indexOf(sourceId)
  return [KIND_RANK[claim.signal.kind], priority === -1 ? REGION_PRIORITY.length + sourceRank(sourceId) : priority]
}

function byStrength(left: Claim, right: Claim): number {
  const [leftKind, leftSource] = claimRank(left)
  const [rightKind, rightSource] = claimRank(right)
  return leftKind - rightKind || leftSource - rightSource
}

/**
 * One claim per region, signal kind and source. Several of one blog's reports
 * of the same objective — Nugara's "Middle Sister II" beside "Middle Sister" —
 * would otherwise say the same thing once each; their votes are summed
 * instead, so the page reads "6 of 7 linked reports" rather than "3 of 3" twice.
 */
function mergeClaims(claims: readonly Claim[]): Claim[] {
  const merged = new Map<string, Claim>()
  for (const claim of claims) {
    const sourceId = 'sourceId' in claim.signal ? claim.signal.sourceId : ''
    const weak = 'weak' in claim.signal && claim.signal.weak ? 'weak' : ''
    const id = `${claim.regionId}|${claim.signal.kind}|${sourceId}|${weak}`
    const existing = merged.get(id)
    if (existing && isVote(existing.signal) && isVote(claim.signal)) {
      merged.set(id, {
        regionId: claim.regionId,
        signal: { ...claim.signal, agreeing: existing.signal.agreeing + claim.signal.agreeing, total: existing.signal.total + claim.signal.total }
      })
    } else if (!existing) {
      merged.set(id, claim)
    }
  }
  return [...merged.values()].sort(byStrength)
}

type Vote = Extract<Signal, { kind: 'linked' | 'companion' }>

/** A signal that counts how many of its neighbours agree, and so sums across reports. */
function isVote(signal: Signal): signal is Vote {
  return signal.kind === 'linked' || signal.kind === 'companion'
}

/** What each report's own source states, mapped onto the taxonomy. */
function statedClaims(reports: readonly RawReport[]): Claim[] {
  return reports.flatMap((report) => {
    const regionId = mappedRegionOf(report)
    return regionId && regionId !== OUT_OF_SCOPE ? [{ regionId, signal: { kind: 'stated', sourceId: report.sourceId } }] : []
  })
}

/**
 * Splits a shared name back into one objective per mountain.
 *
 * Reports go to the region their own source filed them under; the ones whose
 * source named no region stay with the winning partition, since there is
 * nothing better to go on. Both peaks keep the name — they are on different
 * pages, which is the disambiguation. Inferred claims are not applied to
 * either: a link vote or a position is evidence about a name, and this name
 * belongs to two places.
 */
function splitHomonym(group: readonly RawReport[], fallbackRegion: string | undefined): Map<string, RawReport[]> {
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
  if (fallbackRegion && partitions.has(fallbackRegion)) partitions.get(fallbackRegion)!.push(...unplaced)
  return partitions
}

interface Context {
  readonly guidebooks?: GuidebookIndex
  readonly inferred: Inferred
}

/**
 * Every claim about one name group that is not a homonym. A curated override
 * replaces the rest rather than joining them: it exists because the sources are
 * wrong about this objective — Steven Song files the whole Selkirk range under
 * one heading, which puts Rogers Pass and the Kokanee Glacier 200 km apart in
 * one bucket — and listing it under their region as well would undo it.
 */
function claimsOf(key: string, group: readonly RawReport[], { guidebooks, inferred }: Context): Claim[] {
  const overridden = REGION_OVERRIDES[key]
  if (overridden) return [{ regionId: overridden, signal: { kind: 'curated' } }]

  const tickList = guidebooks?.regions.get(key)
  return mergeClaims([
    ...statedClaims(group),
    ...(tickList ? [{ regionId: tickList, signal: { kind: 'tick-list' } } satisfies Claim] : []),
    ...group.flatMap(report => inferred.byReport.get(report.url) ?? []),
    ...(inferred.byKey.get(key) ?? [])
  ])
}

/** Thin or split inferred evidence, used only for an objective nothing else places. */
function weakClaimsOf(key: string, group: readonly RawReport[], inferred: Inferred): Claim[] {
  return mergeClaims([
    ...group.flatMap(report => inferred.weak.byReport.get(report.url) ?? []),
    ...(inferred.weak.byKey.get(key) ?? [])
  ])
}

/** Whether a position says the objective is outside every region: a trailhead abroad, a name in northern BC. */
function isOutside(key: string, group: readonly RawReport[], inferred: Inferred): boolean {
  return inferred.outside.has(key) || group.some(report => inferred.outside.has(report.url))
}

function objectiveOf(key: string, name: string, reports: readonly RawReport[], claims: readonly Claim[], guidebooks?: GuidebookIndex): Objective {
  for (const claim of claims) {
    if (!REGION_IDS.has(claim.regionId)) throw new UnknownRegionError(name, claim.regionId)
  }
  return {
    key,
    name,
    claims,
    subRange: reports.find(report => report.subRange)?.subRange,
    reports: sortReports(reports),
    guidebooks: guidebooks?.entries.get(key)
  }
}

function dropped(key: string, group: readonly RawReport[], reason: Dropped['reason'], sourceIds: readonly string[]): Dropped {
  return { key, name: pickName(key, group), reason, sourceIds, url: group[0]?.url ?? '' }
}

/**
 * The objectives one name group becomes: none if it is out of scope, one
 * normally, one per mountain if two share the name.
 *
 * Out of scope means a blog files it somewhere this site does not cover and
 * nothing *stated* places it here. An inferred region does not rescue it: a
 * Utah peak sharing a name with a Kananaskis one is still in Utah.
 */
function place(key: string, group: readonly RawReport[], context: Context): Objective[] | Dropped {
  if (REGION_OVERRIDES[key] === OUT_OF_SCOPE) return dropped(key, group, 'curated', [])
  const name = pickName(key, group)

  if (isHomonym(group)) {
    const fallback = REGION_OVERRIDES[key] ?? strongestStatedRegion(group)
    // A tick-list entry is about one of the mountains, the one in its region:
    // Steven Song's Mount Murchison above Squamish is not the 11,000er.
    const tickRegion = context.guidebooks?.regions.get(key)
    return [...splitHomonym(group, fallback)]
      .filter(([regionId]) => REGION_IDS.has(regionId))
      .map(([regionId, reports]) => objectiveOf(key, name, reports,
        mergeClaims(statedClaims(reports).filter(claim => claim.regionId === regionId)),
        !tickRegion || tickRegion === regionId ? context.guidebooks : undefined))
  }

  const claims = claimsOf(key, group, context)
  const filedElsewhere = group.filter(report => mappedRegionOf(report) === OUT_OF_SCOPE)
  if (filedElsewhere.length > 0 && !claims.some(isStated)) {
    return dropped(key, group, 'filed-elsewhere', [...new Set(filedElsewhere.map(report => report.sourceId))])
  }
  if (claims.length > 0) return [objectiveOf(key, name, group, claims, context.guidebooks)]

  // Nothing places it: settle for weak evidence, then for knowing it is outside
  // every region, before leaving it unsorted.
  const weak = weakClaimsOf(key, group, context.inferred)
  if (weak.length === 0 && isOutside(key, group, context.inferred)) return dropped(key, group, 'outside', [])
  return [objectiveOf(key, name, group, weak, context.guidebooks)]
}

/** The distinct regions an objective is listed under, strongest first. */
export function regionsOf(objective: Objective): string[] {
  return [...new Set(objective.claims.map(claim => claim.regionId))]
}

function groupByRegion(objectives: readonly Objective[]): Map<string, Objective[]> {
  const byRegion = new Map<string, Objective[]>()
  for (const objective of objectives) {
    for (const regionId of regionsOf(objective)) {
      byRegion.set(regionId, [...(byRegion.get(regionId) ?? []), objective])
    }
  }
  for (const list of byRegion.values()) list.sort(byName)
  return byRegion
}

/**
 * `guidebooks` is optional so the builder can be exercised without fetching the
 * lists. When present it annotates objectives with the books they appear in,
 * and its Region column is one more stated claim.
 *
 * `inferred` comes from inference.ts, which reads a first build made without
 * it; see there for why the build runs twice.
 */
export function buildObjectives(
  reports: readonly RawReport[],
  guidebooks?: GuidebookIndex,
  inferred: Inferred = NOTHING_INFERRED
): BuildResult {
  const groups = [...groupByObjective(reports.map(withCuratedObjectives))]
  const outcomes = groups.map(([key, group]) => place(key, group, { guidebooks, inferred }))
  const objectives = outcomes.flatMap(outcome => Array.isArray(outcome) ? outcome : []).sort(byName)

  return {
    objectives,
    byRegion: groupByRegion(objectives),
    unplaced: objectives.filter(objective => objective.claims.length === 0),
    dropped: outcomes.flatMap(outcome => Array.isArray(outcome) ? [] : [outcome]).sort((left, right) => left.key.localeCompare(right.key))
  }
}
