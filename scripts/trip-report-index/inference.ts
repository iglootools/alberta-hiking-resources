/**
 * Regions inferred from evidence that is not itself a region.
 *
 * Four blogs state no region anywhere, and their objectives used to wait on the
 * catch-all page until another blog covered them. What they do publish is
 * evidence of place: Andrew Nugara's reports link his reports of neighbouring
 * peaks (as do Spectacular Mountains' trips, on the pages its paths do not file), On-Top's link the trailhead on a map, and Explor8ion names a sub-range
 * even on trips its region pages omit. Official names can also be found on a
 * map. None of that is a region, but each can be turned into one by asking
 * where the *placed* objectives around it are.
 *
 * So this runs between two builds: the first places what the blogs state, this
 * reads the result for the evidence's neighbours, and the second lists every
 * objective under every region a signal names. Every claim made here keeps its
 * signal, and the pages say "inferred" next to it, so a reader sees which
 * regions a blog states and which this script worked out.
 *
 * The thresholds below were measured against objectives the blogs do place
 * (leave-one-out), where an inference can be checked:
 *
 *   | signal              | right, at these thresholds |
 *   |---------------------|----------------------------|
 *   | Nugara's links      | 186 of 198 (94%)           |
 *   | Spectacular's links | 68 of 68                   |
 *   | On-Top's trailheads | 183 of 195 (94%)           |
 *   | named places        | 521 of 571 (91%)           |
 *   | same-report peaks   | 648 of 655 (99%)           |
 *
 * The misses cluster at boundaries that are hard to see from neighbours — Banff
 * against the Icefields Parkway, Sunshine against Assiniboine, Highway 93 South
 * against Kootenay — which is where the stated regions disagree most too.
 *
 * Below those thresholds the evidence is still evidence: one placed link, a
 * trailhead between two regions, a vote split three ways. Listing such an
 * objective under each region it might be in, marked *weakly* inferred and with
 * its counts, is more use to a reader than the catch-all page, so that is what
 * happens — but only for an objective nothing stronger places. A weak vote never
 * adds a region to an objective that already has one.
 *
 * And a position far from every placed objective says something too: not "where
 * in the taxonomy" but "outside it". On-Top's trailheads include Arizona,
 * Colorado, Hawaii and Bavaria; those are dropped as out of scope, the way a blog
 * that files a trip abroad has it dropped.
 */
import type { BuildResult } from './build.ts'
import type { Gazetteer } from './gazetteer.ts'
import type { Landmark } from './geo.ts'
import type { Claim, Coordinates, Objective, RawReport } from './types.ts'
import { nearestRegion } from './geo.ts'
import { OUT_OF_SCOPE, mappedRegionOf } from './regions.ts'
import { isStated } from './types.ts'

/** The winning region's minimum share of a vote. Below it, nothing is inferred. */
const MIN_SHARE = 0.8

/** A report linking only one placed report is too easily the exception: 92% rather than 94%. */
const MIN_LINKS = 2

/**
 * Nearer than this to a placed objective, or nothing is inferred. A position
 * with no placed neighbour is outside anything the taxonomy covers — or a
 * mistyped link: one On-Top trailhead sits 1,500 km from the peak it names.
 */
const MAX_NEAREST_KM = 25

/** The share a region needs of a weak vote to be listed. Up to three regions can clear it. */
const WEAK_MIN_SHARE = 0.25

/** How near a position must be to a placed objective for even a weak inference. */
const WEAK_MAX_NEAREST_KM = 30

/**
 * Further than this from every placed objective is outside the taxonomy. The
 * nearest real case inside it is under 30 km; Drumheller's badlands, 52 km out
 * on the prairie, are the nearest outside.
 */
const OUTSIDE_KM = 50

/** Rounds of letting newly placed reports vote on their neighbours. The second adds a handful; the third, none. */
const LINK_ROUNDS = 3

/** Claims about the report's objectives, by report URL, and about an objective as a whole, by key. */
export interface InferredClaims {
  readonly byReport: ReadonlyMap<string, readonly Claim[]>
  readonly byKey: ReadonlyMap<string, readonly Claim[]>
}

export interface Inferred extends InferredClaims {
  /** Thin or split evidence, for an objective nothing else places. */
  readonly weak: InferredClaims
  /** Report URLs and objective keys whose position is far outside every region. */
  readonly outside: ReadonlySet<string>
}

const NO_CLAIMS: InferredClaims = { byReport: new Map(), byKey: new Map() }

export const NOTHING_INFERRED: Inferred = { ...NO_CLAIMS, weak: NO_CLAIMS, outside: new Set() }

function statedRegions(objective: Objective): Set<string> {
  return new Set(objective.claims.filter(isStated).map(claim => claim.regionId))
}

/** The regions stated for the objectives each report covers, by report URL. */
function regionsByUrl(objectives: readonly Objective[]): Map<string, Set<string>> {
  const byUrl = new Map<string, Set<string>>()
  for (const objective of objectives) {
    const regions = statedRegions(objective)
    if (regions.size === 0) continue
    for (const report of objective.reports) {
      byUrl.set(report.url, new Set([...(byUrl.get(report.url) ?? []), ...regions]))
    }
  }
  return byUrl
}

/**
 * Objectives with one stated region that the gazetteer can find: the points
 * proximity votes are taken among. An objective the blogs file in two regions
 * would vote for both, so it is left out rather than counted twice.
 */
export function landmarksOf(objectives: readonly Objective[], gazetteer: Gazetteer): Landmark[] {
  return objectives.flatMap((objective) => {
    const regions = [...statedRegions(objective)]
    const position = gazetteer.get(objective.key)
    return regions.length === 1 && position ? [{ key: objective.key, regionId: regions[0]!, ...position }] : []
  })
}

/** The placed reports a report links to, as the region sets they are placed in. */
function placedLinks(report: RawReport, regions: ReadonlyMap<string, ReadonlySet<string>>): ReadonlySet<string>[] {
  return (report.relatedUrls ?? []).flatMap((url) => {
    const set = regions.get(url)
    return set && set.size > 0 ? [set] : []
  })
}

/** Each region's share of a vote among placed neighbours, largest first. One placed in two regions splits its vote. */
function linkShares(placed: readonly ReadonlySet<string>[]): [string, number][] {
  const weights = new Map<string, number>()
  for (const set of placed) {
    for (const regionId of set) weights.set(regionId, (weights.get(regionId) ?? 0) + 1 / set.size)
  }
  return [...weights].map(([regionId, weight]): [string, number] => [regionId, weight / placed.length])
    .sort((left, right) => right[1] - left[1])
}

function linkedClaim(report: RawReport, regionId: string, placed: readonly ReadonlySet<string>[], weak: boolean): Claim {
  return {
    regionId,
    signal: {
      kind: 'linked',
      sourceId: report.sourceId,
      agreeing: placed.filter(set => set.has(regionId)).length,
      total: placed.length,
      ...(weak ? { weak: true } : {})
    }
  }
}

/** The region a report's links point at, when enough of them agree. */
export function linkVote(
  report: RawReport,
  regions: ReadonlyMap<string, ReadonlySet<string>>
): Claim | undefined {
  const placed = placedLinks(report, regions)
  if (placed.length < MIN_LINKS) return undefined
  const [regionId, share] = linkShares(placed)[0]!
  return share >= MIN_SHARE ? linkedClaim(report, regionId, placed, false) : undefined
}

/** Every region a report's links point at with a meaningful share, however few they are. */
export function weakLinkVotes(report: RawReport, regions: ReadonlyMap<string, ReadonlySet<string>>): Claim[] {
  const placed = placedLinks(report, regions)
  if (placed.length === 0) return []
  return linkShares(placed)
    .filter(([, share]) => share >= WEAK_MIN_SHARE)
    .map(([regionId]) => linkedClaim(report, regionId, placed, true))
}

/**
 * Link votes, repeated so a report placed by its links can vote for the
 * reports that link to it in turn. Only a vote that clears the thresholds is
 * passed on, so a weak inference does not compound.
 */
function inferFromLinks(
  reports: readonly RawReport[],
  stated: ReadonlyMap<string, Set<string>>
): { claims: Map<string, Claim>, regions: Map<string, Set<string>> } {
  const linking = reports.filter(report => report.relatedUrls?.length)
  const regionsWith = (claims: ReadonlyMap<string, Claim>) => {
    const regions = new Map(stated)
    for (const [url, claim] of claims) {
      if (!regions.has(url)) regions.set(url, new Set([claim.regionId]))
    }
    return regions
  }
  let claims = new Map<string, Claim>()
  for (let round = 0; round < LINK_ROUNDS; round += 1) {
    const regions = regionsWith(claims)
    const next = new Map(linking.flatMap((report) => {
      const claim = linkVote(report, regions)
      return claim ? [[report.url, claim] as const] : []
    }))
    if (next.size === claims.size) return { claims: next, regions: regionsWith(next) }
    claims = next
  }
  return { claims, regions: regionsWith(claims) }
}

/**
 * What a position says: a region when the vote is clear, every plausible
 * region when it is not, and "outside" when it is far from everything placed.
 */
type Proximity
  = | { readonly kind: 'region', readonly regionId: string }
    | { readonly kind: 'weak', readonly regionIds: readonly string[] }
    | { readonly kind: 'outside' }
    | { readonly kind: 'none' }

function proximity(point: Coordinates, landmarks: readonly Landmark[], exclude?: ReadonlySet<string>): Proximity {
  const vote = nearestRegion(point, landmarks, { exclude })
  if (!vote) return { kind: 'none' }
  if (vote.nearestKm > OUTSIDE_KM) return { kind: 'outside' }
  if (vote.share >= MIN_SHARE && vote.nearestKm <= MAX_NEAREST_KM) return { kind: 'region', regionId: vote.regionId }
  if (vote.nearestKm > WEAK_MAX_NEAREST_KM) return { kind: 'none' }
  return { kind: 'weak', regionIds: vote.shares.filter(entry => entry.share >= WEAK_MIN_SHARE).map(entry => entry.regionId) }
}

/** Collects claims, weak claims and "outside" verdicts under one id: a report URL or an objective key. */
class Findings {
  readonly claims = new Map<string, Claim[]>()
  readonly weak = new Map<string, Claim[]>()
  readonly outside = new Set<string>()

  add(id: string, claim: Claim): void {
    if (claim.regionId !== OUT_OF_SCOPE) this.claims.set(id, [...(this.claims.get(id) ?? []), claim])
  }

  addWeak(id: string, claims: readonly Claim[]): void {
    if (claims.length > 0) this.weak.set(id, [...(this.weak.get(id) ?? []), ...claims])
  }

  /** Records what a position says, wrapping each region into a claim with `signal`. */
  addProximity(id: string, found: Proximity, signal: (weak: boolean) => Claim['signal']): void {
    if (found.kind === 'region') this.add(id, { regionId: found.regionId, signal: signal(false) })
    if (found.kind === 'weak') this.addWeak(id, found.regionIds.map(regionId => ({ regionId, signal: signal(true) })))
    if (found.kind === 'outside') this.outside.add(id)
  }
}

/**
 * Learns which region each sub-range belongs to from the objectives already
 * placed under it, and awards a range spanning two regions to the one holding
 * more of it. Explor8ion's ranges are its own vocabulary, already tied to
 * regions by the 800-odd trips it does file, so this needs no curation and
 * follows the source if it re-files a range.
 */
function learnSubRanges(objectives: readonly Objective[]): Map<string, string> {
  const tally = new Map<string, Map<string, number>>()
  for (const objective of objectives) {
    const regions = [...statedRegions(objective)]
    if (!objective.subRange || regions.length !== 1) continue
    const counts = tally.get(objective.subRange) ?? new Map<string, number>()
    counts.set(regions[0]!, (counts.get(regions[0]!) ?? 0) + 1)
    tally.set(objective.subRange, counts)
  }
  return new Map([...tally].map(([subRange, counts]) =>
    [subRange, [...counts].sort((left, right) => right[1] - left[1])[0]![0]]))
}

/** Reports that name a sub-range but no region of their own. */
function inferFromSubRanges(reports: readonly RawReport[], learned: ReadonlyMap<string, string>): Map<string, Claim> {
  return new Map(reports.flatMap((report) => {
    const regionId = report.subRange && !mappedRegionOf(report) ? learned.get(report.subRange) : undefined
    return regionId
      ? [[report.url, { regionId, signal: { kind: 'sub-range', sourceId: report.sourceId, subRange: report.subRange! } }] as const]
      : []
  }))
}

/**
 * Trailheads, voted among the landmarks other than the report's own
 * objectives, so the vote is evidence independent of what is already stated
 * about them.
 */
function inferFromTrailheads(findings: Findings, reports: readonly RawReport[], landmarks: readonly Landmark[], keysOf: (report: RawReport) => ReadonlySet<string>): void {
  for (const report of reports) {
    if (!report.trailhead) continue
    findings.addProximity(report.url, proximity(report.trailhead, landmarks, keysOf(report)),
      weak => ({ kind: 'trailhead', sourceId: report.sourceId, ...(weak ? { weak: true } : {}) }))
  }
}

/** Objectives whose own name the gazetteer finds, voted among the other landmarks. */
function inferFromNames(findings: Findings, objectives: readonly Objective[], gazetteer: Gazetteer, landmarks: readonly Landmark[]): void {
  for (const objective of objectives) {
    const position = gazetteer.get(objective.key)
    if (!position) continue
    findings.addProximity(objective.key, proximity(position, landmarks, new Set([objective.key])),
      weak => ({ kind: 'named-place', ...(weak ? { weak: true } : {}) }))
  }
}

/**
 * Objectives one report covers alongside one the blogs place. A report is one
 * day out, so the peaks it names are within a day's walk of each other:
 * Nugara's "Lineham Ridge and GR593982", Explor8ion's "Ward, Mount & Allison &
 * Window". Measured leave-one-out on objectives that are placed, the other
 * peaks in the same report name the right region 648 times in 655 when at
 * least MIN_SHARE of them agree — one companion is enough — and 82 in 97 when
 * they are split, which is a weak inference.
 *
 * A name two peaks share is left out on both sides, since its region is
 * evidence about the other mountain as often as this one: Nugara's "Medicine
 * Peak, Mount Henry, Mount Ellsworth, Appistoki Peak" is in Montana, and the
 * Mount Henry other blogs place is in Jasper.
 */
function inferFromCompanions(findings: Findings, objectives: readonly Objective[]): void {
  const occurrences = new Map<string, number>()
  for (const objective of objectives) occurrences.set(objective.key, (occurrences.get(objective.key) ?? 0) + 1)
  const unique = objectives.filter(objective => occurrences.get(objective.key) === 1)

  const placedByUrl = new Map<string, { key: string, regions: Set<string> }[]>()
  for (const objective of unique) {
    const regions = statedRegions(objective)
    if (regions.size === 0) continue
    for (const report of objective.reports) {
      placedByUrl.set(report.url, [...(placedByUrl.get(report.url) ?? []), { key: objective.key, regions }])
    }
  }

  for (const objective of unique) {
    if (statedRegions(objective).size > 0) continue
    for (const report of objective.reports) {
      const placed = (placedByUrl.get(report.url) ?? []).filter(companion => companion.key !== objective.key).map(companion => companion.regions)
      if (placed.length === 0) continue
      const shares = linkShares(placed)
      const [regionId, share] = shares[0]!
      const claim = (region: string, weak: boolean): Claim => ({
        regionId: region,
        signal: {
          kind: 'companion',
          sourceId: report.sourceId,
          agreeing: placed.filter(set => set.has(region)).length,
          total: placed.length,
          ...(weak ? { weak: true } : {})
        }
      })
      if (share >= MIN_SHARE) findings.add(objective.key, claim(regionId, false))
      else findings.addWeak(objective.key, shares.filter(([, weight]) => weight >= WEAK_MIN_SHARE).map(([region]) => claim(region, true)))
    }
  }
}

/** Every report, once, across all objectives. */
function reportsOf(objectives: readonly Objective[]): RawReport[] {
  return [...new Map(objectives.flatMap(objective => objective.reports.map(report => [report.url, report] as const))).values()]
}

/** `firstPass` is a build with nothing inferred: only what is stated places anything here. */
export function inferRegions(firstPass: BuildResult, gazetteer: Gazetteer): Inferred {
  const objectives = firstPass.objectives
  const reports = reportsOf(objectives)
  const landmarks = landmarksOf(objectives, gazetteer)
  const keysByUrl = new Map<string, Set<string>>()
  for (const objective of objectives) {
    for (const report of objective.reports) keysByUrl.set(report.url, new Set([...(keysByUrl.get(report.url) ?? []), objective.key]))
  }

  const byReport = new Findings()
  for (const [url, claim] of inferFromSubRanges(reports, learnSubRanges(objectives))) byReport.add(url, claim)
  const links = inferFromLinks(reports, regionsByUrl(objectives))
  for (const [url, claim] of links.claims) byReport.add(url, claim)
  for (const report of reports) {
    if (!links.claims.has(report.url)) byReport.addWeak(report.url, weakLinkVotes(report, links.regions))
  }
  inferFromTrailheads(byReport, reports, landmarks, report => keysByUrl.get(report.url) ?? new Set())

  const byKey = new Findings()
  inferFromNames(byKey, objectives, gazetteer, landmarks)
  inferFromCompanions(byKey, objectives)

  return {
    byReport: byReport.claims,
    byKey: byKey.claims,
    weak: { byReport: byReport.weak, byKey: byKey.weak },
    outside: new Set([...byReport.outside, ...byKey.outside])
  }
}
