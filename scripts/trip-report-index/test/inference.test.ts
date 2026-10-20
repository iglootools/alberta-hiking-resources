import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Gazetteer } from '../gazetteer.ts'
import type { Landmark } from '../geo.ts'
import type { RawReport } from '../types.ts'
import { buildObjectives } from '../build.ts'
import { indexFeatures, readGazetteer, withAmericanGaps } from '../gazetteer.ts'
import { distanceKm, nearestRegion } from '../geo.ts'
import { inferRegions, linkVote, weakLinkVotes } from '../inference.ts'
import { stubFetcher } from './support.ts'

const BANFF = { lat: 51.18, lon: -115.57 }
const CANMORE = { lat: 51.09, lon: -115.36 }

const landmark = (key: string, regionId: string, at: { lat: number, lon: number }): Landmark => ({ key, regionId, ...at })

describe('nearestRegion', () => {
  const landmarks = [
    landmark('a', 'banff', BANFF),
    landmark('b', 'banff', { lat: 51.2, lon: -115.6 }),
    landmark('c', 'kananaskis-canmore', CANMORE)
  ]

  it('votes for the region of the nearest landmarks, weighted by distance', () => {
    const vote = nearestRegion({ lat: 51.19, lon: -115.58 }, landmarks)
    assert.equal(vote?.regionId, 'banff')
    assert.ok(vote!.share > 0.8)
  })

  it('leaves the excluded keys out of the vote', () => {
    const vote = nearestRegion(BANFF, landmarks, { exclude: new Set(['a', 'b']) })
    assert.equal(vote?.regionId, 'kananaskis-canmore')
    assert.equal(vote?.share, 1)
  })

  it('measures roughly the right distance', () => {
    assert.ok(Math.abs(distanceKm(BANFF, CANMORE) - 17) < 2)
  })
})

describe('linkVote', () => {
  const report: RawReport = { sourceId: 'anugara', title: 'X', url: 'u', objectives: ['X'], relatedUrls: ['a', 'b', 'c', 'd'] }

  it('places a report where the reports it links to are placed', () => {
    const regions = new Map([['a', new Set(['banff'])], ['b', new Set(['banff'])], ['c', new Set(['banff'])]])
    assert.deepEqual(linkVote(report, regions),
      { regionId: 'banff', signal: { kind: 'linked', sourceId: 'anugara', agreeing: 3, total: 3 } })
  })

  it('infers nothing from a single placed link', () => {
    assert.equal(linkVote(report, new Map([['a', new Set(['banff'])]])), undefined)
  })

  it('infers nothing from a split vote', () => {
    const regions = new Map([['a', new Set(['banff'])], ['b', new Set(['yoho'])]])
    assert.equal(linkVote(report, regions), undefined)
  })
})

describe('weakLinkVotes', () => {
  const report: RawReport = { sourceId: 'anugara', title: 'X', url: 'u', objectives: ['X'], relatedUrls: ['a', 'b'] }

  it('names every region a split vote points at, with its counts', () => {
    const regions = new Map([['a', new Set(['banff'])], ['b', new Set(['yoho'])]])
    assert.deepEqual(weakLinkVotes(report, regions), [
      { regionId: 'banff', signal: { kind: 'linked', sourceId: 'anugara', agreeing: 1, total: 2, weak: true } },
      { regionId: 'yoho', signal: { kind: 'linked', sourceId: 'anugara', agreeing: 1, total: 2, weak: true } }
    ])
  })

  it('takes a single placed link', () => {
    assert.equal(weakLinkVotes(report, new Map([['a', new Set(['banff'])]]))[0]?.regionId, 'banff')
  })
})

describe('inferRegions', () => {
  const placedNear = (name: string, url: string): RawReport =>
    ({ sourceId: 'spirko', title: name, url, objectives: [name], sourceRegion: 'Banff' })
  const placed = [placedNear('Peak One', 'https://p/1'), placedNear('Peak Two', 'https://p/2'), placedNear('Peak Three', 'https://p/3')]
  const gazetteer: Gazetteer = new Map([
    ['peak one', BANFF],
    ['peak two', { lat: 51.19, lon: -115.58 }],
    ['peak three', { lat: 51.2, lon: -115.6 }],
    ['nameless knob', { lat: 51.185, lon: -115.575 }]
  ])

  it('places a report by its links, then a report linking only to that one', () => {
    const first: RawReport = { sourceId: 'anugara', title: 'Hidden', url: 'https://n/1', objectives: ['Hidden'], relatedUrls: ['https://p/1', 'https://p/2'] }
    const second: RawReport = { sourceId: 'anugara', title: 'Deeper', url: 'https://n/2', objectives: ['Deeper'], relatedUrls: ['https://n/1', 'https://p/3'] }
    const inferred = inferRegions(buildObjectives([...placed, first, second]), new Map())
    assert.equal(inferred.byReport.get(first.url)?.[0]?.regionId, 'banff')
    assert.equal(inferred.byReport.get(second.url)?.[0]?.regionId, 'banff')
  })

  it('places a trailhead among the landmarks near it', () => {
    const report: RawReport = { sourceId: 'ontop', title: 'Walk', url: 'https://o/1', objectives: ['Walk'], trailhead: BANFF }
    const inferred = inferRegions(buildObjectives([...placed, report]), gazetteer)
    assert.deepEqual(inferred.byReport.get(report.url), [{ regionId: 'banff', signal: { kind: 'trailhead', sourceId: 'ontop' } }])
  })

  it('marks a trailhead far from every landmark as outside, rather than placing it', () => {
    const report: RawReport = { sourceId: 'ontop', title: 'Far', url: 'https://o/2', objectives: ['Far'], trailhead: { lat: 45, lon: -100 } }
    const inferred = inferRegions(buildObjectives([...placed, report]), gazetteer)
    assert.equal(inferred.byReport.get(report.url), undefined)
    assert.ok(inferred.outside.has(report.url))
  })

  it('names each nearby region weakly when a trailhead sits between them', () => {
    const between = [
      { sourceId: 'spirko', title: 'Yoho One', url: 'https://p/4', objectives: ['Yoho One'], sourceRegion: 'Field' },
      { sourceId: 'spirko', title: 'Yoho Two', url: 'https://p/5', objectives: ['Yoho Two'], sourceRegion: 'Field' }
    ]
    const near: Gazetteer = new Map([...gazetteer, ['yoho one', { lat: 51.21, lon: -115.62 }], ['yoho two', { lat: 51.2, lon: -115.61 }]])
    const report: RawReport = { sourceId: 'ontop', title: 'Pass', url: 'https://o/3', objectives: ['Pass'], trailhead: { lat: 51.195, lon: -115.6 } }
    const inferred = inferRegions(buildObjectives([...placed, ...between, report]), near)
    assert.deepEqual(inferred.weak.byReport.get(report.url)?.map(claim => claim.regionId).sort(), ['banff', 'yoho'])
  })

  it('places an objective by the placed peaks in the same report', () => {
    const report: RawReport = { sourceId: 'anugara', title: 'Peak One and GR123456', url: 'https://n/4', objectives: ['Peak One', 'GR123456'] }
    const inferred = inferRegions(buildObjectives([...placed, report]), new Map())
    assert.deepEqual(inferred.byKey.get('gr123456'),
      [{ regionId: 'banff', signal: { kind: 'companion', sourceId: 'anugara', agreeing: 1, total: 1 } }])
    assert.equal(inferred.byKey.get('peak one'), undefined)
  })

  it('names each region weakly when the peaks in the same report disagree', () => {
    const yoho: RawReport = { sourceId: 'spirko', title: 'Yoho One', url: 'https://p/6', objectives: ['Yoho One'], sourceRegion: 'Field' }
    const report: RawReport = { sourceId: 'anugara', title: 'Traverse', url: 'https://n/5', objectives: ['Peak One', 'Yoho One', 'Col Between'] }
    const inferred = inferRegions(buildObjectives([...placed, yoho, report]), new Map())
    assert.equal(inferred.byKey.get('col between'), undefined)
    assert.deepEqual(inferred.weak.byKey.get('col between')?.map(claim => claim.regionId).sort(), ['banff', 'yoho'])
  })

  it('takes no vote from a name two peaks share', () => {
    const elsewhere: RawReport = { sourceId: 'spirko', title: 'Peak One', url: 'https://p/7', objectives: ['Peak One'], sourceRegion: 'Field' }
    const report: RawReport = { sourceId: 'anugara', title: 'Peak One and Hidden Col', url: 'https://n/6', objectives: ['Peak One', 'Hidden Col'] }
    const inferred = inferRegions(buildObjectives([...placed, elsewhere, report]), new Map())
    assert.equal(inferred.byKey.get('hidden col'), undefined)
    assert.equal(inferred.weak.byKey.get('hidden col'), undefined)
  })

  it('places an objective whose name the gazetteer finds', () => {
    const report: RawReport = { sourceId: 'anugara', title: 'Nameless Knob', url: 'https://n/3', objectives: ['Nameless Knob'] }
    const inferred = inferRegions(buildObjectives([...placed, report]), gazetteer)
    assert.deepEqual(inferred.byKey.get('nameless knob'), [{ regionId: 'banff', signal: { kind: 'named-place' } }])
  })
})

describe('indexFeatures', () => {
  it('drops a name shared by two places far apart', () => {
    const gazetteer = indexFeatures([
      { name: 'Storm Mountain', featureClass: 'MTN', ...BANFF },
      { name: 'Storm Mountain', featureClass: 'MTN', lat: 50.5, lon: -114.8 }
    ])
    assert.equal(gazetteer.has('storm mountain'), false)
  })

  it('prefers the mountain where a name is also a lake', () => {
    const gazetteer = indexFeatures([
      { name: 'Mount Temple', featureClass: 'MTN', ...BANFF },
      { name: 'Mount Temple', featureClass: 'LAKE', lat: 50.0, lon: -116.0 }
    ])
    assert.deepEqual(gazetteer.get('mount temple'), BANFF)
  })
})

describe('withAmericanGaps', () => {
  const MONTANA = { lat: 48.67, lon: -113.76 }

  it('adds an American name Canada does not have', () => {
    const gazetteer = withAmericanGaps([{ name: 'Mount Temple', featureClass: 'MTN', ...BANFF }], [{ name: 'Bearhat Mountain', featureClass: 'MTN', ...MONTANA }])
    assert.deepEqual(gazetteer.get('bearhat mountain'), MONTANA)
  })

  it('keeps the Canadian position of a name found on both sides of the border', () => {
    const gazetteer = withAmericanGaps([{ name: 'Pinnacle Mountain', featureClass: 'MTN', ...BANFF }], [{ name: 'Pinnacle Mountain', featureClass: 'MTN', ...MONTANA }])
    assert.deepEqual(gazetteer.get('pinnacle mountain'), BANFF)
  })

  it('does not settle a name Canada already finds ambiguous', () => {
    const gazetteer = withAmericanGaps([
      { name: 'Storm Mountain', featureClass: 'MTN', ...BANFF },
      { name: 'Storm Mountain', featureClass: 'MTN', lat: 50.5, lon: -114.8 }
    ], [{ name: 'Storm Mountain', featureClass: 'MTN', ...MONTANA }])
    assert.equal(gazetteer.has('storm mountain'), false)
  })
})

describe('readGazetteer', () => {
  it('fails when the API yields too few features to be real', async () => {
    await assert.rejects(readGazetteer(stubFetcher(() => '{"items":[]}')),
      { name: 'MinimumNotMetError', subject: 'gazetteer', found: 0 })
  })

  it('fails when the API answers in a shape it was not written against', async () => {
    await assert.rejects(readGazetteer(stubFetcher(() => '{}')), { name: 'SourceChangedError', source: 'gazetteer' })
  })
})
