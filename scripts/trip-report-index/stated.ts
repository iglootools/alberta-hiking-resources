/**
 * Where the sources themselves say a report is: each label mapped through its
 * source's vocabulary (sources/catalog.ts) onto the taxonomy, and what a name's
 * stated regions say about how many mountains share it.
 */
import type { RawReport } from './types.ts'
import type { SourceId } from './sources/catalog.ts'
import { REGION_MAP, REGION_PRIORITY, rankIn } from './sources/catalog.ts'
import { OUT_OF_SCOPE, areNeighbours } from './regions.ts'

/** The region id or OUT_OF_SCOPE the report's own source files it under, or undefined when it files it nowhere we map. */
export function mappedRegionOf(report: RawReport): string | undefined {
  return report.sourceRegion ? REGION_MAP[report.sourceId]?.[report.sourceRegion] : undefined
}

/**
 * The stated regions of a name group, gathered into one group per mountain.
 *
 * Two regions are the same mountain's when they share a boundary and no single
 * blog files the name under both. The second rule is the self-consistency test
 * near-miss names are judged by: if one blog files "Storm Mountain" under Banff
 * and Kananaskis, those are two peaks, since no blog lists one summit twice. The
 * first catches what that test cannot, which is two blogs each filing their own
 * mountain: Mount Bishop under Kananaskis by four, and under the Sea to Sky by
 * Steven Song, whose Bishop is on the North Shore.
 *
 * Returned as sets of region ids; a name with one set is one mountain.
 */
export function mountainsOf(reports: readonly RawReport[]): Set<string>[] {
  const bySource = new Map<SourceId, Set<string>>()
  for (const report of reports) {
    const mapped = mappedRegionOf(report)
    if (!mapped || mapped === OUT_OF_SCOPE) continue
    bySource.set(report.sourceId, new Set([...(bySource.get(report.sourceId) ?? []), mapped]))
  }
  const filings = [...bySource.values()]
  // Each blog's own regions start as one mountain apiece; a blog filing a name
  // in two regions is two mountains, so its regions never share a group.
  let groups = [...new Set(filings.flatMap(set => [...set]))].map(region => new Set([region]))

  // Groups join, transitively, when a region of one borders a region of the
  // other and no blog files the name in both. Listing a peak under three
  // regions it straddles is better than splitting it three ways, so a chain of
  // neighbours stays one mountain — Parker Ridge, where Banff, the Icefields
  // Parkway and Jasper meet. What splits is a gap no border bridges, or a blog
  // keeping two apart: Explor8ion files a Limestone Mountain under Kananaskis
  // and another under David Thompson, and the Ghost between them can join one
  // but not both.
  const joinable = (left: Set<string>, right: Set<string>) =>
    [...left].some(a => [...right].some(b => areNeighbours(a, b)))
    && !filings.some(set => [...left].some(region => set.has(region)) && [...right].some(region => set.has(region)))

  for (;;) {
    const pair = groups.flatMap((left, index) => groups.slice(index + 1).map(right => [left, right] as const))
      .find(([left, right]) => joinable(left, right))
    if (!pair) return groups
    const [left, right] = pair
    groups = [...groups.filter(group => group !== left && group !== right), new Set([...left, ...right])]
  }
}

/**
 * The region stated by the most trusted blog among `reports`, or undefined
 * when none states one we cover.
 */
export function strongestStatedRegion(reports: readonly RawReport[]): string | undefined {
  const ranked = reports
    .map(report => ({ regionId: mappedRegionOf(report), rank: rankIn(REGION_PRIORITY, report.sourceId) }))
    .filter(entry => entry.regionId && entry.regionId !== OUT_OF_SCOPE)
    .sort((left, right) => left.rank - right.rank)
  return ranked[0]?.regionId
}
