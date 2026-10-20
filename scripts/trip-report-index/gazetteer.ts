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
 *
 * South of the border, the same extent is read from the USGS Geographic Names
 * Information System, which is in the public domain. Without it, Glacier
 * National Park in Montana — a region of its own here — had no positions at
 * all: its peaks could neither be found by name nor serve as landmarks, so
 * nothing near them could be inferred.
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

const US_API = 'https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/5/query'

/**
 * GNIS classes worth reading. Its Landforms layer also holds capes, islands,
 * gaps, valleys and flats, which outnumber the summits on the Washington coast
 * and would push the tiles past the page size for nothing.
 */
const US_CLASSES = ['Summit', 'Ridge', 'Pillar'] as const

/** The part of EXTENT south of the 49th parallel. */
const US_EXTENT = { west: EXTENT.west, east: EXTENT.east, south: EXTENT.south, north: 49 }

/** The service's page size; as with the Canadian API, a full page has been cut short. */
const US_PAGE = 2000

/** Well under the ~2,300 the band held when this was written. */
const US_MINIMUM_FEATURES = 1500

export interface Feature extends Coordinates {
  readonly name: string
  readonly featureClass: string
}

/** One position per name the gazetteer can place unambiguously, by canonical key. */
export type Gazetteer = ReadonlyMap<string, Coordinates>

interface UsFeature {
  readonly attributes?: { readonly gaz_name?: string }
  readonly geometry?: { readonly points?: readonly (readonly [number, number])[], readonly x?: number, readonly y?: number }
}

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

function usTileUrls(): string[] {
  const where = `gaz_featureclass IN (${US_CLASSES.map(name => `'${name}'`).join(',')})`
  const urls: string[] = []
  for (let lon = US_EXTENT.west; lon < US_EXTENT.east; lon += 1) {
    const query = new URLSearchParams({
      where,
      geometry: `${lon},${US_EXTENT.south},${lon + 1},${US_EXTENT.north}`,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      outSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'gaz_name',
      returnGeometry: 'true',
      f: 'json'
    })
    urls.push(`${US_API}?${query}`)
  }
  return urls
}

/** One GNIS tile. Its features are all landforms, so they rank as mountains when a name is also a lake. */
async function readUsTile(fetchText: Fetcher, url: string): Promise<Feature[]> {
  const body = JSON.parse(await fetchText(url)) as { features?: UsFeature[], exceededTransferLimit?: boolean }
  if (!Array.isArray(body.features)) throw new SourceChangedError('gazetteer', `no features array at ${url}`)
  if (body.exceededTransferLimit || body.features.length >= US_PAGE) {
    throw new SourceChangedError('gazetteer', `${url} returned a full page; split the tiles`)
  }
  return body.features.flatMap((feature) => {
    const name = feature.attributes?.gaz_name
    const [lon, lat] = feature.geometry?.points?.[0] ?? [feature.geometry?.x, feature.geometry?.y]
    return name && typeof lat === 'number' && typeof lon === 'number' ? [{ name, lat, lon, featureClass: 'MTN' }] : []
  })
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
  const usFeatures: Feature[] = []
  for (const url of usTileUrls()) usFeatures.push(...await readUsTile(fetchText, url))
  if (usFeatures.length < US_MINIMUM_FEATURES) {
    throw new MinimumNotMetError('gazetteer', usFeatures.length, US_MINIMUM_FEATURES, 'named US features')
  }
  return withAmericanGaps(features, usFeatures)
}

/**
 * The Canadian index, with American names added only where Canada has no
 * feature of that name at all.
 *
 * Indexing both together would drop every name found on both sides of the
 * border as ambiguous, and border names repeat often: Sumas Mountain is in
 * both British Columbia and Washington, and there are Pinnacle Mountains in
 * Banff and in Montana. Those were placed correctly before the American names
 * were read, and would no longer be. Filling gaps instead means no name
 * resolves differently than it did on Canadian data alone, while the
 * Montana-only names, which are why the American data is read, are added.
 */
export function withAmericanGaps(canadian: readonly Feature[], american: readonly Feature[]): Gazetteer {
  const canadianKeys = new Set(canadian.map(feature => objectiveKey(feature.name)))
  const gaps = [...indexFeatures(american)].filter(([key]) => !canadianKeys.has(key))
  return new Map([...indexFeatures(canadian), ...gaps])
}
