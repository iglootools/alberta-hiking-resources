/**
 * The land, lakes and borders under the SVG region map, from Natural Earth.
 *
 * Natural Earth is public domain, which is why it is the one geodata set baked
 * into the site rather than fetched at runtime the way MapLibre's tiles are.
 * The 1:50m scale is plenty for a map a few hundred pixels across, and the
 * files are pinned to a release tag so a refresh cannot redraw the coastline
 * by surprise.
 *
 * Read through the same cached fetcher as the blogs, so iterating costs nothing.
 */
import type { Fetcher } from './fetch.ts'
import type { Extent, Projection } from './region-map.ts'
import { SourceChangedError } from './errors.ts'

const RELEASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson'

/**
 * How few features may fall inside the extent before the file is assumed to
 * have changed shape: the land is one polygon, the borders are at least
 * British Columbia, Alberta, Washington, Idaho and Montana.
 */
const LAYERS = {
  land: { file: 'ne_50m_land', minimum: 1 },
  lakes: { file: 'ne_50m_lakes', minimum: 5 },
  borders: { file: 'ne_50m_admin_1_states_provinces_lakes', minimum: 5 }
} as const

/** Towns named on the SVG map so a reader can find their bearings. Not regions: just landmarks. */
const TOWNS: readonly { readonly name: string, readonly lat: number, readonly lon: number }[] = [
  { name: 'Calgary', lat: 51.045, lon: -114.06 },
  { name: 'Edmonton', lat: 53.55, lon: -113.49 },
  { name: 'Vancouver', lat: 49.28, lon: -123.12 },
  { name: 'Kamloops', lat: 50.67, lon: -120.33 },
  { name: 'Kelowna', lat: 49.89, lon: -119.49 },
  { name: 'Banff', lat: 51.18, lon: -115.57 },
  { name: 'Jasper', lat: 52.87, lon: -118.08 },
  { name: 'Golden', lat: 51.3, lon: -116.97 },
  { name: 'Revelstoke', lat: 51.0, lon: -118.2 },
  { name: 'Nelson', lat: 49.49, lon: -117.29 },
  { name: 'Cranbrook', lat: 49.51, lon: -115.77 },
  { name: 'Whistler', lat: 50.12, lon: -122.95 }
]

export interface Basemap {
  readonly land: string
  readonly lakes: string
  readonly borders: string
  readonly towns: readonly { readonly name: string, readonly x: number, readonly y: number }[]
}

type Ring = readonly (readonly [number, number])[]
type Geometry = { readonly type: 'Polygon', readonly coordinates: readonly Ring[] }
  | { readonly type: 'MultiPolygon', readonly coordinates: readonly (readonly Ring[])[] }

interface Feature {
  readonly geometry: Geometry | null
}

const polygons = (geometry: Geometry): readonly (readonly Ring[])[] =>
  geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates

const inside = (extent: Extent, [lon, lat]: readonly [number, number]) =>
  lon > extent.west && lon < extent.east && lat > extent.south && lat < extent.north

/**
 * A ring as SVG path data, with points outside a padded extent clamped onto it
 * — which keeps a continent-sized polygon's fill correct inside the frame at a
 * fraction of its size — and points closer than `minimumPixels` to the last
 * one dropped.
 */
function ringPath(ring: Ring, extent: Extent, project: Projection, minimumPixels = 1.6): string {
  const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
  const points: [number, number][] = []
  for (const [lon, lat] of ring) {
    const point: [number, number] = [
      project.x(clamp(lon, extent.west - 1, extent.east + 1)),
      project.y(clamp(lat, extent.south - 1, extent.north + 1))
    ]
    const last = points.at(-1)
    if (!last || Math.hypot(point[0] - last[0], point[1] - last[1]) > minimumPixels) points.push(point)
  }
  return points.length > 2 ? `M${points.map(point => point.join(' ')).join('L')}Z` : ''
}

async function readLayer(fetchText: Fetcher, layer: keyof typeof LAYERS, extent: Extent): Promise<Feature[]> {
  const { file, minimum } = LAYERS[layer]
  const url = `${RELEASE}/${file}.geojson`
  const body = JSON.parse(await fetchText(url)) as { features?: Feature[] }
  if (!Array.isArray(body.features)) throw new SourceChangedError('natural-earth', `no features array at ${url}`)
  const found = body.features.filter(feature => feature.geometry
    && polygons(feature.geometry).some(polygon => polygon[0]!.some(point => inside(extent, point))))
  if (found.length < minimum) {
    throw new SourceChangedError('natural-earth', `${file} has ${found.length} features in the map extent, expected at least ${minimum}`)
  }
  return found
}

/** Outer rings only for lakes and borders: an island in a lake would otherwise punch a hole in the water. */
function layerPath(features: readonly Feature[], extent: Extent, project: Projection, outerOnly: boolean): string {
  return features.flatMap(feature => polygons(feature.geometry!))
    .flatMap(polygon => outerOnly ? [polygon[0]!] : polygon)
    .map(ring => ringPath(ring, extent, project))
    .join('')
}

export async function readBasemap(fetchText: Fetcher, extent: Extent, project: Projection): Promise<Basemap> {
  const [land, lakes, borders] = await Promise.all([
    readLayer(fetchText, 'land', extent),
    readLayer(fetchText, 'lakes', extent),
    readLayer(fetchText, 'borders', extent)
  ])
  return {
    land: layerPath(land, extent, project, false),
    lakes: layerPath(lakes, extent, project, true),
    borders: layerPath(borders, extent, project, true),
    towns: TOWNS.map(town => ({ name: town.name, x: project.x(town.lon), y: project.y(town.lat) }))
  }
}
