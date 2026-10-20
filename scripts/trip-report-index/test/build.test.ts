import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { GuidebookIndex } from '../guidebooks.ts'
import type { Inferred } from '../inference.ts'
import type { RawReport } from '../types.ts'
import { buildObjectives, regionsOf } from '../build.ts'
import { NOTHING_INFERRED } from '../inference.ts'
import { canonKey } from '../canon.ts'
import { readGuidebooks } from '../guidebooks.ts'
import { writeReview } from '../review.ts'
import { stubFetcher } from './support.ts'

// A name no source or curation entry will ever mention, and a source id no
// region map knows, so only the guidebook region below can place it.
const NAME = 'Mount Testington'
const report: RawReport = { sourceId: 'test', title: NAME, url: 'https://x.test/1', objectives: [NAME] }
const guidebookRegion = (regionId: string): GuidebookIndex =>
  ({ entries: new Map(), regions: new Map([[canonKey(NAME), regionId]]) })

describe('buildObjectives', () => {
  it('places an objective from a guidebook region', () => {
    const result = buildObjectives([report], guidebookRegion('banff'))
    assert.deepEqual(result.byRegion.get('banff')?.map(objective => objective.name), [NAME])
    assert.equal(result.unplaced.length, 0)
  })

  it('leaves an objective nothing places for curation', () => {
    assert.deepEqual(buildObjectives([report]).unplaced.map(objective => objective.name), [NAME])
  })

  it('lists an objective under every region a source states, strongest first', () => {
    const reports: RawReport[] = [
      { ...report, sourceId: 'spirko', url: 'https://x.test/a', sourceRegion: 'Banff' },
      { ...report, sourceId: 'explor8ion', url: 'https://x.test/b', sourceRegion: 'columbia-icefield' }
    ]
    const result = buildObjectives(reports)
    assert.deepEqual(regionsOf(result.objectives[0]!), ['icefields-parkway', 'banff'])
    assert.deepEqual(result.byRegion.get('banff')?.map(objective => objective.name), [NAME])
    assert.deepEqual(result.byRegion.get('icefields-parkway')?.map(objective => objective.name), [NAME])
  })

  it('lets a curated region replace every other claim', () => {
    // 'pringle mount' is curated to the Ghost in curation.ts.
    const curated: RawReport = { ...report, title: 'Pringle Mount', objectives: ['Pringle Mount'], sourceId: 'spirko', sourceRegion: 'Banff' }
    const [objective] = buildObjectives([curated]).objectives
    assert.deepEqual(objective?.claims, [{ regionId: 'ghost-front-ranges', signal: { kind: 'curated' } }])
  })

  it('places an objective from an inferred claim, keeping the signal', () => {
    const claim = { regionId: 'kananaskis-canmore', signal: { kind: 'trailhead', sourceId: 'test' } } as const
    const inferred: Inferred = { ...NOTHING_INFERRED, byReport: new Map([[report.url, [claim]]]) }
    const result = buildObjectives([report], undefined, inferred)
    assert.deepEqual(result.objectives[0]?.claims, [claim])
    assert.equal(result.unplaced.length, 0)
  })

  it('sums one blog\u2019s link votes across its reports of one objective', () => {
    const second: RawReport = { ...report, url: 'https://x.test/2' }
    const linked = (agreeing: number, total: number) =>
      [{ regionId: 'banff', signal: { kind: 'linked', sourceId: 'test', agreeing, total } } as const]
    const inferred: Inferred = { ...NOTHING_INFERRED, byReport: new Map([[report.url, linked(2, 2)], [second.url, linked(3, 4)]]) }
    const [objective] = buildObjectives([report, second], undefined, inferred).objectives
    assert.deepEqual(objective?.claims, [{ regionId: 'banff', signal: { kind: 'linked', sourceId: 'test', agreeing: 5, total: 6 } }])
  })

  it('does not let an inferred region rescue an objective a blog files out of scope', () => {
    const abroad: RawReport = { ...report, sourceId: 'stevensong', sourceRegion: 'the-north' }
    const inferred: Inferred = { ...NOTHING_INFERRED, byKey: new Map([[canonKey(NAME), [{ regionId: 'banff', signal: { kind: 'named-place' } }]]]) }
    const result = buildObjectives([abroad], undefined, inferred)
    assert.equal(result.objectives.length, 0)
    assert.deepEqual(result.dropped.map(entry => [entry.reason, entry.sourceIds]), [['filed-elsewhere', ['stevensong']]])
  })

  it('uses weak evidence only where nothing else places the objective', () => {
    const weak = (regionId: string) => ({ regionId, signal: { kind: 'trailhead', sourceId: 'test', weak: true } } as const)
    const inferred: Inferred = {
      ...NOTHING_INFERRED,
      weak: { byReport: new Map([[report.url, [weak('banff'), weak('yoho')]]]), byKey: new Map() }
    }
    assert.deepEqual(regionsOf(buildObjectives([report], undefined, inferred).objectives[0]!), ['banff', 'yoho'])

    const placed = buildObjectives([report], guidebookRegion('kootenay'), inferred).objectives[0]!
    assert.deepEqual(regionsOf(placed), ['kootenay'])
  })

  it('drops an objective nothing places whose position is outside every region', () => {
    const result = buildObjectives([report], undefined, { ...NOTHING_INFERRED, outside: new Set([report.url]) })
    assert.equal(result.objectives.length, 0)
    assert.deepEqual(result.dropped.map(entry => entry.reason), ['outside'])
  })

  it('marks only the peak in the tick-list\u2019s region when one blog files a name in two', () => {
    const entry = { book: '11,000ers', grade: '3,353 m', url: 'https://a/murchison' }
    const guidebooks: GuidebookIndex = { entries: new Map([[canonKey(NAME), [entry]]]), regions: new Map([[canonKey(NAME), 'icefields-parkway']]) }
    const reports: RawReport[] = [
      { ...report, sourceId: 'explor8ion', url: 'https://x.test/a', sourceRegion: 'columbia-icefield' },
      { ...report, sourceId: 'explor8ion', url: 'https://x.test/b', sourceRegion: 'kananaskis-country' }
    ]
    const marked = buildObjectives(reports, guidebooks).objectives.map(objective => [regionsOf(objective)[0], objective.guidebooks?.length ?? 0])
    assert.deepEqual(marked.sort(), [['icefields-parkway', 1], ['kananaskis-canmore', 0]])
  })

  it('fails on a region id outside the taxonomy', () => {
    assert.throws(() => buildObjectives([report], guidebookRegion('atlantis')),
      { name: 'UnknownRegionError', objective: NAME, regionId: 'atlantis' })
  })
})

describe('readGuidebooks', () => {
  it('fails when a list yields fewer rows than its minimum', async () => {
    await assert.rejects(readGuidebooks(stubFetcher(() => '<table></table>')),
      { name: 'MinimumNotMetError', subject: '11000ers-of-the-canadian-rockies', found: 0, minimum: 50 })
  })
})

describe('writeReview sections', () => {
  const empty = { objectives: [], byRegion: new Map(), unplaced: [], dropped: [] }
  const on = new Date(Date.UTC(2026, 0, 1))

  it('lists what is new on the catch-all page', () => {
    const objective = { key: 'k', name: 'Funnel Peak', claims: [], reports: [{ sourceId: 'x', title: 't', url: 'https://u', objectives: [] }] }
    assert.match(writeReview(empty, on, { newlyUnsorted: [objective] }), /1 objectives are new[\s\S]*- \*\*Funnel Peak\*\* — x — https:\/\/u/)
  })

  it('lists each dropped name under its reason', () => {
    const review = writeReview({ ...empty, dropped: [{ key: 'puigmal', name: 'Puigmal', reason: 'filed-elsewhere', sourceIds: ['spectacularmountains'], url: 'https://u' }] }, on)
    assert.match(review, /### Filed by a blog[^\n]*\(1\)\n\n- `puigmal` \(spectacularmountains\) — https:\/\/u/)
  })
})

describe('writeReview', () => {
  it('dates the worksheet in UTC from the date it is given', () => {
    // 03:00 UTC on the 2nd is still the 1st anywhere west of Greenwich.
    const review = writeReview(
      { objectives: [], byRegion: new Map(), unplaced: [], dropped: [] },
      new Date(Date.UTC(2026, 0, 2, 3))
    )
    assert.match(review, /on 2026-01-02 \(UTC\)\./)
  })
})
