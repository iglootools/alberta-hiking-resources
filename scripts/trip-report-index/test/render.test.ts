import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Objective } from '../types.ts'
import { REGIONS } from '../regions.ts'
import { renderRegionPage } from '../render.ts'

const region = (id: string) => REGIONS.find(candidate => candidate.id === id)!

const bowPeak: Objective = {
  key: 'bow peak',
  name: 'Bow Peak',
  reports: [{ sourceId: 'explor8ion', title: 'Bow Peak', url: 'https://e/bow', objectives: ['Bow Peak'] }],
  claims: [
    { regionId: 'icefields-parkway', signal: { kind: 'stated', sourceId: 'explor8ion' } },
    { regionId: 'icefields-parkway', signal: { kind: 'stated', sourceId: 'stevensong' } },
    { regionId: 'banff', signal: { kind: 'stated', sourceId: 'spirko' } },
    { regionId: 'banff', signal: { kind: 'trailhead', sourceId: 'ontop' } }
  ]
}

describe('renderRegionPage', () => {
  it('says under each entry who puts it where, this page first and the others linked', () => {
    const page = renderRegionPage(region('banff'), [bowPeak])
    assert.ok(page.includes(
      '  - **Banff National Park**: Bob Spirko; inferred from On-Top’s trailhead'
      + ' · [Icefields Parkway and the Columbia Icefield](/hiking-scrambling-beta/trip-reports/icefields-parkway): Explor8ion, Steven Song'
    ))
  })

  it('describes a link vote with its counts', () => {
    const nugara: Objective = {
      key: 'burns ridge',
      name: 'Burns Ridge',
      reports: [{ sourceId: 'anugara', title: 'Burns Ridge', url: 'https://a/burns', objectives: ['Burns Ridge'] }],
      claims: [{ regionId: 'kananaskis-canmore', signal: { kind: 'linked', sourceId: 'anugara', agreeing: 4, total: 5 } }]
    }
    assert.ok(renderRegionPage(region('kananaskis-canmore'), [nugara]).includes(
      '  - **Kananaskis Country and Canmore**: inferred from 4 of the 5 placed Andrew Nugara reports it links to'
    ))
  })
})
