/**
 * Where a named place is, from the Canadian Geographical Names Database.
 *
 * Read through Natural Resources Canada's geonames API, under the Open
 * Government Licence – Canada, which asks only for attribution (given on the
 * pages). The bulk CSV downloads would be one request instead of hundreds, but
 * they answer 403 to anything that is not a browser; the API is the route that
 * works, and the HTTP cache makes it a one-off cost per refresh.
 *
 * It holds official names only. Most objectives no blog places are unofficial —
 * "Burns Ridge", "Clougarvan Peak" — which is precisely why no other blog
 * shares the name, so this places few of them on its own (measured: 49 of
 * Andrew Nugara's 413). Its larger job is supplying the landmarks that
 * trailhead coordinates are voted against; see inference.ts.
 */
import type { Fetcher } from './fetch.ts'
import type { Coordinates } from './types.ts'
import { objectiveKey } from './canon.ts'
import { MinimumNotMetError, SourceChangedError } from './errors.ts'
import { distanceKm } from './geo.ts'

const API = 'https://geogratis.gc.ca/services/geoname/en/geonames.json'

/**
 * Feature classes worth reading: mountains (which includes ridges and peaks),
 * lakes and glaciers. Objectives are mostly summits, and the rest are mostly
 * lakes; a stream or a town shares names with peaks far too often to help.
 */
const CLASSES = ['MTN', 'LAKE', 'GLAC'] as const

/** Every region in the taxonomy fits inside this, in whole degrees. */
const EXTENT = { west: -126, east: -112, south: 48, north: 55 }

/** The API's page size. A tile that fills it has been cut short, not emptied. */
const PAGE = 1000

/** Two features further apart than this under one name are two places. */
const SAME_PLACE_KM = 10

/** Well under the ~14,000 the extent held when this was written. */
const MINIMUM_FEATURES = 8000

export interface Feature extends Coordinates {
  readonly name: string
  readonly featureClass: string
}

/** One position per name the gazetteer can place unambiguously, by canonical key. */
export type Gazetteer = ReadonlyMap<string, Coordinates>

interface ApiItem {
  readonly name: string
  readonly latitude: number
  readonly longitude: number
}

function tileUrls(): string[] {
  const urls: string[] = []
  for (const featureClass of CLASSES) {
    for (let lon = EXTENT.west; lon < EXTENT.east; lon += 1) {
      for (let lat = EXTENT.south; lat < EXTENT.north; lat += 1) {
        urls.push(`${API}?bbox=${lon},${lat},${lon + 1},${lat + 1}&concise=${featureClass}&num=${PAGE}`)
      }
    }
  }
  return urls
}

async function readTile(fetchText: Fetcher, url: string): Promise<Feature[]> {
  const body = JSON.parse(await fetchText(url)) as { items?: ApiItem[] }
  if (!Array.isArray(body.items)) throw new SourceChangedError('gazetteer', `no items array at ${url}`)
  if (body.items.length >= PAGE) {
    throw new SourceChangedError('gazetteer', `${url} returned a full page; split the tiles`)
  }
  const featureClass = /concise=(\w+)/.exec(url)?.[1] ?? ''
  return body.items.map(item => ({ name: item.name, lat: item.latitude, lon: item.longitude, featureClass }))
}

/**
 * Collapses features to one position per name, dropping names that point at
 * two places. Storm Mountain is in both Banff and the Highwood; guessing
 * between them is how a page ends up with the wrong peak's beta.
 *
 * Where a name is both a mountain and a lake, the mountain wins: the
 * objectives are mostly summits, and a lake is usually named for the peak above
 * it, so the two are seldom far apart.
 */
export function indexFeatures(features: readonly Feature[]): Gazetteer {
  const byKey = new Map<string, Feature[]>()
  for (const feature of features) {
    const key = objectiveKey(feature.name)
    if (key) byKey.set(key, [...(byKey.get(key) ?? []), feature])
  }

  const gazetteer = new Map<string, Coordinates>()
  for (const [key, all] of byKey) {
    const mountains = all.filter(feature => feature.featureClass === 'MTN')
    const candidates = mountains.length > 0 ? mountains : all
    const spread = candidates.some(a => candidates.some(b => distanceKm(a, b) > SAME_PLACE_KM))
    if (spread) continue
    gazetteer.set(key, {
      lat: candidates.reduce((sum, feature) => sum + feature.lat, 0) / candidates.length,
      lon: candidates.reduce((sum, feature) => sum + feature.lon, 0) / candidates.length
    })
  }
  return gazetteer
}

export async function readGazetteer(fetchText: Fetcher): Promise<Gazetteer> {
  const features: Feature[] = []
  for (const url of tileUrls()) features.push(...await readTile(fetchText, url))
  if (features.length < MINIMUM_FEATURES) {
    throw new MinimumNotMetError('gazetteer', features.length, MINIMUM_FEATURES, 'named features')
  }
  return indexFeatures(features)
}
