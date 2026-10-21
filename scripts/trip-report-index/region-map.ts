/**
 * Region shapes for the map on the section index pages, drawn from where the
 * placed objectives are rather than by hand.
 *
 * The extent is cut into cells of a few kilometres, and each cell takes the
 * region its nearest objectives vote for — the same distance-weighted vote
 * inference.ts uses to place an objective from its position (see geo.ts), so
 * the map shows the taxonomy the way the index itself applies it. A cell with
 * no objective near it belongs to no region and is left blank: the regions
 * are where the trips are, not a partition of the province.
 *
 * Accepted weaknesses, since the map is on trial (ADR-010): the edges are a
 * staircase at cell resolution, and a region whose objectives are almost all
 * shared with a neighbour — Kootenay, with Banff and the BC Rockies — comes out
 * as a sliver. The run prints the regions drawn that small.
 *
 * Everything here is pure; basemap.ts fetches, main.ts writes.
 */
import type { Gazetteer } from './gazetteer.ts'
import type { Coordinates, Objective } from './types.ts'
import { regionsOf } from './build.ts'
import { distanceKm } from './geo.ts'

export interface Extent {
  readonly west: number
  readonly east: number
  readonly south: number
  readonly north: number
}

/** Vancouver Island to the Alberta foothills, Jasper to Glacier National Park. */
export const MAP_EXTENT: Extent = { west: -128.6, east: -112.7, south: 48.15, north: 54.1 }

/** About 5.5 km either way at these latitudes. */
const CELL = { lat: 0.05, lon: 0.075 }

/** Objectives that vote on a cell, and how far the nearest may be before the cell is left blank. */
const VOTERS = 7
const REACH_KM = 30

/**
 * An objective with no other of its region this close is most likely a name
 * the gazetteer found somewhere else — Storm Mountain is in Banff and in the
 * Highwood — and left in, it paints an island far from its region.
 */
const ISOLATION_KM = 35

export interface MapPoint extends Coordinates {
  readonly regionId: string
  /** An objective listed under n regions votes 1/n for each. */
  readonly weight: number
}

export interface Grid {
  readonly extent: Extent
  readonly rows: number
  readonly cols: number
  /** Row-major region indices into the `regionIds` the grid was drawn for; -1 is no region. */
  readonly cells: readonly number[]
}

/** Every placed objective the gazetteer can position, once per region it is listed under. */
export function mapPoints(objectives: readonly Objective[], gazetteer: Gazetteer): MapPoint[] {
  return objectives.flatMap((objective) => {
    const position = gazetteer.get(objective.key)
    const regionIds = regionsOf(objective)
    if (!position || regionIds.length === 0) return []
    return regionIds.map(regionId => ({ regionId, weight: 1 / regionIds.length, lat: position.lat, lon: position.lon }))
  })
}

export function dropIsolated(points: readonly MapPoint[], km = ISOLATION_KM): MapPoint[] {
  return points.filter(point => points.some(other =>
    other !== point && other.regionId === point.regionId && distanceKm(point, other) < km))
}

function cellVote(at: Coordinates, points: readonly MapPoint[], regionIds: readonly string[]): number {
  const nearest = points
    .map(point => ({ point, km: distanceKm(at, point) }))
    .sort((left, right) => left.km - right.km)
    .slice(0, VOTERS)
  if (nearest.length === 0 || nearest[0]!.km > REACH_KM) return -1
  const votes = new Map<string, number>()
  for (const { point, km } of nearest) votes.set(point.regionId, (votes.get(point.regionId) ?? 0) + point.weight / (km + 1))
  const [winner] = [...votes].sort((left, right) => right[1] - left[1])[0]!
  return regionIds.indexOf(winner)
}

/**
 * A cell that at least six of its eight neighbours disagree with takes theirs,
 * twice over: a lone objective otherwise leaves a one-cell speck of its region
 * inside another, too small to see or click.
 */
function despeckle(grid: Grid): Grid {
  const pass = (cells: readonly number[]) => cells.map((value, index) => {
    const row = Math.floor(index / grid.cols), col = index % grid.cols
    if (row === 0 || col === 0 || row === grid.rows - 1 || col === grid.cols - 1) return value
    const counts = new Map<number, number>()
    for (const dRow of [-1, 0, 1]) {
      for (const dCol of [-1, 0, 1]) {
        if (dRow === 0 && dCol === 0) continue
        const neighbour = cells[(row + dRow) * grid.cols + col + dCol]!
        counts.set(neighbour, (counts.get(neighbour) ?? 0) + 1)
      }
    }
    const [top, count] = [...counts].sort((left, right) => right[1] - left[1])[0]!
    return count >= 6 ? top : value
  })
  return { ...grid, cells: pass(pass(grid.cells)) }
}

export function rasterize(points: readonly MapPoint[], regionIds: readonly string[], extent: Extent = MAP_EXTENT): Grid {
  const rows = Math.ceil((extent.north - extent.south) / CELL.lat)
  const cols = Math.ceil((extent.east - extent.west) / CELL.lon)
  const cells = Array.from({ length: rows * cols }, (_, index) => cellVote(
    cellCentre(extent, Math.floor(index / cols), index % cols), points, regionIds))
  return despeckle({ extent, rows, cols, cells })
}

function cellCentre(extent: Extent, row: number, col: number): Coordinates {
  return { lat: extent.north - (row + 0.5) * CELL.lat, lon: extent.west + (col + 0.5) * CELL.lon }
}

/** Cell edges as coordinates: row 0 is the north edge, col 0 the west. */
const edgeLat = (grid: Grid, row: number) => round(grid.extent.north - row * CELL.lat)
const edgeLon = (grid: Grid, col: number) => round(grid.extent.west + col * CELL.lon)
const round = (value: number, places = 4) => Number(value.toFixed(places))

/** [col, endCol) runs of one region on one row. */
function runs(grid: Grid, row: number, region: number): [number, number][] {
  const found: [number, number][] = []
  let col = 0
  while (col < grid.cols) {
    if (grid.cells[row * grid.cols + col] !== region) {
      col++
      continue
    }
    const start = col
    while (col < grid.cols && grid.cells[row * grid.cols + col] === region) col++
    found.push([start, col])
  }
  return found
}

/**
 * A region as rectangles in cell units — [col, endCol, row, endRow) — with a
 * run that repeats unchanged on the rows below it merged into one, which is
 * most of them and keeps the output a fraction of the size.
 */
export function rectangles(grid: Grid, region: number): [number, number, number, number][] {
  const done: [number, number, number, number][] = []
  let open = new Map<string, number>()
  for (let row = 0; row <= grid.rows; row++) {
    const current = row < grid.rows ? runs(grid, row, region).map(([start, end]) => `${start}:${end}`) : []
    const next = new Map<string, number>()
    for (const [key, top] of open) {
      if (current.includes(key)) next.set(key, top)
      else done.push([...key.split(':').map(Number) as [number, number], top, row])
    }
    for (const key of current) if (!next.has(key)) next.set(key, row)
    open = next
  }
  return done
}

/** The cell edges between a region and anything else, as segments in cell units. */
function boundary(grid: Grid, region: number): [[number, number], [number, number]][] {
  const at = (row: number, col: number) =>
    row < 0 || col < 0 || row >= grid.rows || col >= grid.cols ? -1 : grid.cells[row * grid.cols + col]
  const segments: [[number, number], [number, number]][] = []
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      if (at(row, col) !== region) continue
      if (at(row - 1, col) !== region) segments.push([[col, row], [col + 1, row]])
      if (at(row + 1, col) !== region) segments.push([[col, row + 1], [col + 1, row + 1]])
      if (at(row, col - 1) !== region) segments.push([[col, row], [col, row + 1]])
      if (at(row, col + 1) !== region) segments.push([[col + 1, row], [col + 1, row + 1]])
    }
  }
  return segments
}

/** Where to put a region's name: its cell nearest the centroid, so it lands inside even a crescent. */
function labelCell(grid: Grid, region: number): [number, number] | undefined {
  const cells = grid.cells.flatMap((value, index) => value === region ? [[Math.floor(index / grid.cols), index % grid.cols] as const] : [])
  if (cells.length === 0) return undefined
  const meanRow = cells.reduce((sum, [row]) => sum + row, 0) / cells.length
  const meanCol = cells.reduce((sum, [, col]) => sum + col, 0) / cells.length
  const [row, col] = [...cells].sort((left, right) =>
    Math.hypot(left[0] - meanRow, left[1] - meanCol) - Math.hypot(right[0] - meanRow, right[1] - meanCol))[0]!
  return [row, col]
}

export function cellCount(grid: Grid, region: number): number {
  return grid.cells.filter(value => value === region).length
}

/**
 * Equirectangular, with longitude scaled by the cosine of the middle latitude
 * so a kilometre is about as wide as it is tall. Over six degrees of latitude
 * that is close enough for a map whose job is to be clicked.
 */
export interface Projection {
  readonly x: (lon: number) => number
  readonly y: (lat: number) => number
  readonly width: number
  readonly height: number
}

export function projection(extent: Extent = MAP_EXTENT, pixelsPerDegree = 70): Projection {
  const scale = Math.cos(((extent.north + extent.south) / 2) * Math.PI / 180)
  const x = (lon: number) => round((lon - extent.west) * scale * pixelsPerDegree, 1)
  const y = (lat: number) => round((extent.north - lat) * pixelsPerDegree, 1)
  return { x, y, width: x(extent.east), height: y(extent.south) }
}

export interface SvgRegion {
  readonly id: string
  readonly title: string
  /** Empty when no cell went to the region. */
  readonly path: string
  readonly label?: { readonly x: number, readonly y: number }
}

export function svgRegion(grid: Grid, region: number, id: string, title: string, project: Projection): SvgRegion {
  const path = rectangles(grid, region).map(([col, endCol, row, endRow]) => {
    const [left, right] = [project.x(edgeLon(grid, col)), project.x(edgeLon(grid, endCol))]
    const [top, bottom] = [project.y(edgeLat(grid, row)), project.y(edgeLat(grid, endRow))]
    return `M${left} ${top}H${right}V${bottom}H${left}Z`
  }).join('')
  const cell = labelCell(grid, region)
  const label = cell && { x: project.x(edgeLon(grid, cell[1] + 0.5)), y: project.y(edgeLat(grid, cell[0] + 0.5)) }
  return { id, title, path, ...(label ? { label } : {}) }
}

type Position = [number, number]

interface GeoFeature {
  readonly type: 'Feature'
  readonly id: number
  readonly properties: Readonly<Record<string, string | number>>
  readonly geometry:
    | { readonly type: 'MultiPolygon', readonly coordinates: Position[][][] }
    | { readonly type: 'MultiLineString', readonly coordinates: Position[][] }
    | { readonly type: 'Point', readonly coordinates: Position }
}

/**
 * One region as GeoJSON features for MapLibre: its fill, its outline and its
 * label, told apart by `kind`. The feature id is the region's index, so the
 * map can highlight a region's fill and outline together by id.
 */
export function geoFeatures(grid: Grid, region: number, id: string, title: string): GeoFeature[] {
  const position = (col: number, row: number): Position => [edgeLon(grid, col), edgeLat(grid, row)]
  const rects = rectangles(grid, region)
  if (rects.length === 0) return []
  const properties = { region, id, title }
  const cell = labelCell(grid, region)!
  return [
    { type: 'Feature', id: region, properties: { ...properties, kind: 'fill' }, geometry: {
      type: 'MultiPolygon',
      coordinates: rects.map(([col, endCol, row, endRow]) =>
        [[position(col, row), position(endCol, row), position(endCol, endRow), position(col, endRow), position(col, row)]])
    } },
    { type: 'Feature', id: region, properties: { ...properties, kind: 'outline' }, geometry: {
      type: 'MultiLineString',
      coordinates: boundary(grid, region).map(([from, to]) => [position(...from), position(...to)])
    } },
    { type: 'Feature', id: region, properties: { ...properties, kind: 'label' }, geometry: {
      type: 'Point', coordinates: position(cell[1] + 0.5, cell[0] + 0.5)
    } }
  ]
}
