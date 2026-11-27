import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canonKey, displayName, splitCompanions, splitObjectives, uninvert } from '../canon.ts'

describe('splitCompanions', () => {
  it('lifts a "+" parenthetical out as companion summits', () => {
    assert.deepEqual(splitCompanions('Aldridge, Mount (+ Courcelette, Fording)'), { primary: 'Aldridge, Mount', companions: ['Courcelette', 'Fording'] })
  })

  it('drops a bare parenthetical as an aside, and the elevation', () => {
    assert.deepEqual(splitCompanions('Janelea Mountain (Little Tombstone)'), { primary: 'Janelea Mountain', companions: [] })
    assert.deepEqual(splitCompanions('Mount Temple 3544m'), { primary: 'Mount Temple', companions: [] })
  })
})

describe('uninvert', () => {
  it('moves a trailing generic back to the front', () => {
    assert.equal(uninvert('Albert, Mount'), 'Mount Albert')
    assert.equal(uninvert('Albert, Mt.'), 'Mount Albert')
  })

  it('keeps a route or feature that follows the inverted generic', () => {
    assert.equal(uninvert('Buller, Mount North Ridge'), 'Mount Buller North Ridge')
  })

  it('leaves a name already in order alone', () => {
    assert.equal(uninvert('Mount Albert'), 'Mount Albert')
  })
})

describe('splitObjectives', () => {
  const cases: [string, string[]][] = [
    ['Aldridge, Mount (+ Courcelette, Fording)', ['Aldridge, Mount', 'Courcelette', 'Fording']],
    ['Blakiston, Mount & Hawkins & Lineham', ['Blakiston, Mount', 'Hawkins', 'Lineham']],
    ['Sofa | Bertha / Alderson', ['Sofa', 'Bertha', 'Alderson']],
    // A comma without spaces round a separator is an inversion, not a list.
    ['Albert, Mount', ['Albert, Mount']]
  ]
  for (const [title, objectives] of cases) {
    it(`reads ${title}`, () => assert.deepEqual(splitObjectives(title), objectives))
  }
})

describe('displayName', () => {
  it('uninverts, and drops companions and elevation', () => {
    assert.equal(displayName('Aldridge, Mount (+ Courcelette, Fording)'), 'Mount Aldridge')
    assert.equal(displayName('Mount  Temple 3544m'), 'Mount Temple')
  })
})

describe('canonKey', () => {
  it('reads "Mtn" after a name as "Mountain", as "Mt." before one is "Mount"', () => {
    assert.equal(canonKey('Prairie Mtn'), 'prairie mountain')
    assert.equal(canonKey('Mt. Temple'), 'mount temple')
  })

  it('gives an inverted name and its plain spelling one key', () => {
    assert.equal(canonKey('Albert, Mount'), canonKey('Mount Albert'))
  })

  it('folds accents, quotes and a leading "the", and drops elevation', () => {
    assert.equal(canonKey('Îyarhe Îpan'), 'iyarhe ipan')
    assert.equal(canonKey('“Little” Lougheed'), 'little lougheed')
    assert.equal(canonKey('The Wedge'), 'wedge')
    assert.equal(canonKey('Mt. Rae 3218 m'), 'mount rae')
  })
})
