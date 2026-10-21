import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Inferred } from '../inference.ts'
import type { Claim, RawReport } from '../types.ts'
import { buildObjectives, regionsOf } from '../build.ts'
import { objectiveKey } from '../canon.ts'
import { NOTHING_INFERRED } from '../inference.ts'
import { NEIGHBOUR_IDS, REGIONS, REGION_IDS, areNeighbours, mountainsOf } from '../regions.ts'

// A name no curation entry mentions, so only the reports below decide.
const NAME = 'Mount Testington'
let next = 0
const filed = (sourceId: string, sourceRegion: string): RawReport =>
  ({ sourceId, sourceRegion, title: NAME, url: `https://x.test/${next++}`, objectives: [NAME] })

const regionSets = (reports: readonly RawReport[]) =>
  mountainsOf(reports).map(regions => [...regions].sort()).sort()

describe('region adjacency', () => {
  it('names only regions that exist', () => {
    for (const id of NEIGHBOUR_IDS) assert.ok(REGION_IDS.has(id), id)
  })

  it('is symmetric, and gives every region a neighbour', () => {
    for (const { id: left } of REGIONS) {
      assert.ok(REGIONS.some(({ id: right }) => right !== left && areNeighbours(left, right)), `${left} has no neighbour`)
      for (const { id: right } of REGIONS) assert.equal(areNeighbours(left, right), areNeighbours(right, left), `${left}/${right}`)
    }
  })
})

describe('mountainsOf', () => {
  it('keeps a boundary peak whole when two blogs file it on either side', () => {
    assert.deepEqual(regionSets([filed('spirko', 'Banff'), filed('explor8ion', 'columbia-icefield')]), [['banff', 'icefields-parkway']])
  })

  it('splits a name two blogs file in regions no border connects', () => {
    // Mount Bishop: the Elk Range peak, and the North Shore one.
    assert.deepEqual(regionSets([filed('explor8ion', 'kananaskis-country'), filed('stevensong', 'sea-to-sky')]),
      [['kananaskis-canmore'], ['sea-to-sky']])
  })

  it('keeps a chain of neighbours whole, so a peak where three regions meet is listed in all three', () => {
    // Parker Ridge: Banff, the Icefields Parkway and Jasper.
    assert.deepEqual(regionSets([filed('explor8ion', 'banff-national-park'), filed('stevensong', 'icefield-parkway'), filed('spirko', 'Jasper')]),
      [['banff', 'icefields-parkway', 'jasper-robson']])
  })

  it('never joins two regions one blog keeps apart, even through a region between them', () => {
    // Explor8ion's two Limestone Mountains, with Spectacular Mountains' in the Ghost between.
    const mountains = regionSets([
      filed('explor8ion', 'kananaskis-country'),
      filed('explor8ion', 'david-thompson-country'),
      filed('spectacularmountains', 'canada/ghost')
    ])
    assert.equal(mountains.length, 2)
    assert.ok(!mountains.some(regions => regions.includes('kananaskis-canmore') && regions.includes('david-thompson')))
  })
})

describe('buildObjectives placement rules', () => {
  it('lists each mountain of a split name on its own page', () => {
    const result = buildObjectives([filed('explor8ion', 'kananaskis-country'), filed('stevensong', 'sea-to-sky')])
    assert.deepEqual(result.objectives.map(regionsOf).sort(), [['kananaskis-canmore'], ['sea-to-sky']])
  })

  it('leaves out a report its own blog files abroad', () => {
    // Bob Spirko's Arizona Sugarloaf is not Explor8ion's Banff one.
    const abroad = filed('spirko', 'Arizona')
    const [objective] = buildObjectives([filed('explor8ion', 'banff-national-park'), abroad]).objectives
    assert.ok(!objective!.reports.some(report => report.url === abroad.url))
  })

  const withInferred = (reports: readonly RawReport[], claims: readonly Claim[], weak = false): Inferred => {
    const byKey = new Map([[objectiveKey(reports[0]!.objectives[0]!), claims]])
    return weak ? { ...NOTHING_INFERRED, weak: { byReport: new Map(), byKey } } : { ...NOTHING_INFERRED, byKey }
  }

  it('drops an inferred region far from where blogs say the objective is, and keeps a neighbouring one', () => {
    // Helen Lake: stated on the Icefields Parkway, and a namesake's position on Vancouver Island.
    const reports = [filed('explor8ion', 'columbia-icefield')]
    const inferred = withInferred(reports, [
      { regionId: 'vancouver-island', signal: { kind: 'named-place' } },
      { regionId: 'banff', signal: { kind: 'trailhead', sourceId: 'ontop' } }
    ])
    assert.deepEqual(regionsOf(buildObjectives(reports, undefined, inferred).objectives[0]!), ['icefields-parkway', 'banff'])
  })

  it('anchors weak claims on the strongest vote when nothing is stated', () => {
    // Anderson's Southeast Shoulder: two of three links to Waterton, one to the coast.
    const reports: RawReport[] = [{ sourceId: 'anugara', title: NAME, url: 'https://x.test/weak', objectives: [NAME] }]
    const vote = (regionId: string, agreeing: number): Claim =>
      ({ regionId, signal: { kind: 'linked', sourceId: 'anugara', agreeing, total: 3, weak: true } })
    const inferred = withInferred(reports, [vote('vancouver-island', 1), vote('waterton', 2)], true)
    assert.deepEqual(regionsOf(buildObjectives(reports, undefined, inferred).objectives[0]!), ['waterton'])
  })
})
