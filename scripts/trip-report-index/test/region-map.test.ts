import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Extent, Grid, MapPoint } from '../region-map.ts'
import { cellCount, dropIsolated, geoFeatures, projection, rasterize, rectangles, svgRegion } from '../region-map.ts'

const point = (regionId: string, lat: number, lon: number): MapPoint => ({ regionId, weight: 1, lat, lon })

/** A one-degree box around Banff and Canmore, small enough to rasterise in a test. */
const EXTENT: Extent = { west: -116.5, east: -115.0, south: 50.7, north: 51.5 }

describe('dropIsolated', () => {
  it('drops a point with no other of its region nearby, and keeps clustered ones', () => {
    const kept = dropIsolated([
      point('banff', 51.18, -115.57),
      point('banff', 51.2, -115.6),
      point('banff', 49.0, -120.0)
    ])
    assert.equal(kept.length, 2)
    assert.ok(kept.every(p => p.lat > 51))
  })
})

describe('rasterize', () => {
  const regionIds = ['banff', 'kananaskis-canmore']
  const grid = rasterize([
    point('banff', 51.18, -115.57),
    point('banff', 51.25, -115.75),
    point('kananaskis-canmore', 50.95, -115.15),
    point('kananaskis-canmore', 50.85, -115.2)
  ], regionIds, EXTENT)

  const at = (lat: number, lon: number) => {
    const row = Math.floor((EXTENT.north - lat) / 0.05)
    const col = Math.floor((lon - EXTENT.west) / 0.075)
    return grid.cells[row * grid.cols + col]
  }

  it('gives a cell next to an objective that objective\'s region', () => {
    assert.equal(at(51.2, -115.6), 0)
    assert.equal(at(50.9, -115.17), 1)
  })

  it('leaves a cell beyond reach of every objective blank', () => {
    assert.equal(at(51.45, -116.45), -1)
  })

  it('draws every region it was given at least one cell', () => {
    assert.ok(cellCount(grid, 0) > 0)
    assert.ok(cellCount(grid, 1) > 0)
  })
})

describe('rectangles', () => {
  it('merges a run repeated on the rows below into one rectangle', () => {
    const grid: Grid = { extent: EXTENT, rows: 3, cols: 4, cells: [
      0, 0, -1, -1,
      0, 0, -1, -1,
      -1, 0, 0, -1
    ] }
    assert.deepEqual(rectangles(grid, 0).sort(), [[0, 2, 0, 2], [1, 3, 2, 3]].sort())
  })
})

describe('a region no cell went to', () => {
  const empty: Grid = { extent: EXTENT, rows: 1, cols: 2, cells: [-1, -1] }

  it('has an empty SVG path and no label, so the map skips it rather than drawing nothing clickable', () => {
    const region = svgRegion(empty, 0, 'kootenay', 'Kootenay National Park', projection(EXTENT))
    assert.equal(region.path, '')
    assert.equal(region.label, undefined)
  })

  it('has no GeoJSON features', () => {
    assert.deepEqual(geoFeatures(empty, 0, 'kootenay', 'Kootenay National Park'), [])
  })
})
