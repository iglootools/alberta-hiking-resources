import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canonKey } from '../canon.ts'
import { readGuidebooks } from '../guidebooks.ts'
import { stubFetcher } from './support.ts'

const HEADER = '<tr><th>Trip</th><th>Grade</th><th>Region</th></tr>'

/** One list row: a linked name, the second column, and a region. */
const row = (name: string, href: string, second: string, region: string) =>
  `<tr><td><a href="${href}">${name}</a></td><td>${second}</td><td>${region}</td></tr>`

/** Enough filler rows to clear every list's minimum, so a test's own rows are read. */
const FILLER = Array.from({ length: 160 }, (_, index) => row(`Filler Peak ${index}`, `/filler-${index}`, 'Easy', 'Kananaskis')).join('')

/** A fetcher serving each list's table: `rows` for the lists named in it, filler alone for the rest. */
const lists = (rows: Readonly<Record<string, string>>) =>
  stubFetcher((url) => {
    const slug = Object.keys(rows).find(name => url.endsWith(`/lists/${name}`))
    return `<table>${HEADER}${slug ? rows[slug] : ''}${FILLER}</table>`
  })

describe('readGuidebooks', () => {
  it('fails when a list yields fewer rows than its minimum', async () => {
    await assert.rejects(readGuidebooks(stubFetcher(() => '<table></table>')),
      { name: 'MinimumNotMetError', subject: '11000ers-of-the-canadian-rockies', found: 0, minimum: 50 })
  })

  it('leaves out a Region cell naming somewhere outside the taxonomy', async () => {
    const index = await readGuidebooks(lists({ 'kane-scrambles': row('Mount Rainier', '/rainier', 'Difficult', 'Washington') }))
    assert.equal(index.regions.get(canonKey('Mount Rainier')), undefined)
    assert.equal(index.entries.get(canonKey('Mount Rainier'))?.length, 1)
  })
})
