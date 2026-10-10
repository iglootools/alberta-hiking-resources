import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { GuidebookIndex } from '../guidebooks.ts'
import type { RawReport } from '../types.ts'
import { buildObjectives } from '../build.ts'
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

  it('fails on a region id outside the taxonomy', () => {
    assert.throws(() => buildObjectives([report], guidebookRegion('atlantis')),
      { name: 'UnknownRegionError', objective: NAME, regionId: 'atlantis' })
  })
})

describe('readGuidebooks', () => {
  it('fails when a list yields fewer rows than its minimum', async () => {
    await assert.rejects(readGuidebooks(stubFetcher(() => '<table></table>')),
      { name: 'MinimumNotMetError', subject: '11000ers-of-the-Canadian-Rockies', found: 0, minimum: 50 })
  })
})

describe('writeReview', () => {
  it('dates the worksheet in UTC from the date it is given', () => {
    // 03:00 UTC on the 2nd is still the 1st anywhere west of Greenwich.
    const review = writeReview(
      { byRegion: new Map(), unplaced: [], conflicts: [], outOfScopeCount: 0 },
      new Date(Date.UTC(2026, 0, 2, 3))
    )
    assert.match(review, /on 2026-01-02 \(UTC\)\./)
  })
})
