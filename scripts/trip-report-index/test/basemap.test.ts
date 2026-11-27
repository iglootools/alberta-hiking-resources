import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readBasemap } from '../basemap.ts'
import { MAP_EXTENT, projection } from '../region-map.ts'
import { stubFetcher } from './support.ts'

/** A square polygon with a corner inside the map extent. */
const square = (lon: number, lat: number) => ({
  geometry: { type: 'Polygon', coordinates: [[[lon, lat], [lon + 0.5, lat], [lon + 0.5, lat + 0.5], [lon, lat + 0.5], [lon, lat]]] }
})
const featuresIn = (count: number) =>
  JSON.stringify({ features: Array.from({ length: count }, (_, index) => square(-120 + index, 50)) })

describe('readBasemap', () => {
  it('draws every layer when each has enough features in the extent', async () => {
    const basemap = await readBasemap(stubFetcher(() => featuresIn(5)), MAP_EXTENT, projection())
    assert.match(basemap.land, /^M/)
    assert.match(basemap.lakes, /^M/)
    assert.match(basemap.borders, /^M/)
  })

  it('fails with the count when a layer has too few features in the extent', async () => {
    const fetchText = stubFetcher(url => featuresIn(url.includes('lakes') ? 2 : 5))
    await assert.rejects(readBasemap(fetchText, MAP_EXTENT, projection()),
      { name: 'MinimumNotMetError', subject: 'natural-earth', found: 2, minimum: 5 })
  })

  it('fails when a file is not a feature collection', async () => {
    await assert.rejects(readBasemap(stubFetcher(() => '{}'), MAP_EXTENT, projection()),
      { name: 'SourceChangedError', source: 'natural-earth' })
  })
})
