/**
 * Region by proximity: a point is put in the region of the placed objectives
 * nearest to it.
 *
 * Nearest neighbours rather than park polygons, because half the taxonomy is
 * not a park — Kananaskis and Canmore, the Ghost, the Purcells — and the
 * regions follow how the blogs file trips rather than any legal boundary. The
 * placed objectives *are* that filing, so voting among them reproduces it
 * without anyone drawing a boundary. What it cannot do is see a park line
 * between two neighbours, which is where its mistakes cluster: Sunshine and
 * Assiniboine, Highway 93 South and Kootenay. Those are left visible on the
 * page as inferred, next to whatever the blogs state.
 */
import type { Coordinates } from './types.ts'

export interface Landmark extends Coordinates {
  /** The objective this point belongs to, so it can be left out of votes about itself. */
  readonly key: string
  readonly regionId: string
}

export interface ProximityVote {
  readonly regionId: string
  /** The winning region's share of the distance-weighted vote, 0–1. */
  readonly share: number
  /** Every region that received a vote, with its share, largest first. */
  readonly shares: readonly { readonly regionId: string, readonly share: number }[]
  readonly nearestKm: number
}

const EARTH_RADIUS_KM = 6371

/**
 * Equirectangular distance. Exact enough over the tens of kilometres that
 * matter here, and the far-away answers it gets slightly wrong are discarded
 * by the distance cutoff anyway.
 */
export function distanceKm(from: Coordinates, to: Coordinates): number {
  const radians = Math.PI / 180
  const x = (to.lon - from.lon) * radians * Math.cos(((from.lat + to.lat) / 2) * radians)
  const y = (to.lat - from.lat) * radians
  return EARTH_RADIUS_KM * Math.hypot(x, y)
}

/**
 * The region the `k` nearest landmarks vote for, each weighted by 1/(d+1) km
 * so a peak next door outweighs one across the valley. Landmarks whose key is
 * in `exclude` do not vote. Undefined when no landmark is left to.
 */
export function nearestRegion(
  point: Coordinates,
  landmarks: readonly Landmark[],
  { k = 5, exclude = new Set() }: { k?: number, exclude?: ReadonlySet<string> } = {}
): ProximityVote | undefined {
  const nearest = landmarks
    .filter(landmark => !exclude.has(landmark.key))
    .map(landmark => ({ landmark, km: distanceKm(point, landmark) }))
    .sort((left, right) => left.km - right.km)
    .slice(0, k)
  if (nearest.length === 0) return undefined

  const votes = new Map<string, number>()
  for (const { landmark, km } of nearest) {
    votes.set(landmark.regionId, (votes.get(landmark.regionId) ?? 0) + 1 / (km + 1))
  }
  const total = [...votes.values()].reduce((sum, weight) => sum + weight, 0)
  const shares = [...votes]
    .map(([regionId, weight]) => ({ regionId, share: weight / total }))
    .sort((left, right) => right.share - left.share)
  return { ...shares[0]!, shares, nearestKm: nearest[0]!.km }
}
