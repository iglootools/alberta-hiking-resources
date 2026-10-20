import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canonKey } from '../canon.ts'
import { ALIASES, REGION_OVERRIDES } from '../curation.ts'
import { OUT_OF_SCOPE, REGION_IDS } from '../regions.ts'
import { bareNameCandidates } from '../review.ts'

describe('canonKey', () => {
  it('reads "Mtn" after a name as "Mountain", as "Mt." before one is "Mount"', () => {
    assert.equal(canonKey('Prairie Mtn'), 'prairie mountain')
    assert.equal(canonKey('Mt. Temple'), 'mount temple')
  })
})

describe('bareNameCandidates', () => {
  it('pairs a bare name with the one spelling that adds its generic back', () => {
    assert.deepEqual(bareNameCandidates(new Set(['brett', 'mount brett'])), [['brett', 'mount brett']])
  })

  it('leaves a bare name with two such spellings to a human', () => {
    assert.deepEqual(bareNameCandidates(new Set(['cascade', 'mount cascade', 'cascade mountain'])), [])
  })

  it('looks only at names without a generic of their own', () => {
    assert.deepEqual(bareNameCandidates(new Set(['wasootch ridge', 'mount wasootch ridge', 'gr123456', 'gr123456 peak'])), [])
  })
})

describe('curation', () => {
  // An override is looked up by the key after aliases are applied, so one keyed
  // by an alias's variant spelling never fires — silently.
  it('keys no region override by a spelling an alias replaces', () => {
    assert.deepEqual(Object.keys(REGION_OVERRIDES).filter(key => key in ALIASES), [])
  })

  it('overrides only to regions that exist', () => {
    assert.deepEqual(Object.values(REGION_OVERRIDES).filter(regionId => regionId !== OUT_OF_SCOPE && !REGION_IDS.has(regionId)), [])
  })

  it('aliases no spelling onto one that is itself aliased', () => {
    assert.deepEqual(Object.values(ALIASES).filter(target => target in ALIASES), [])
  })
})
