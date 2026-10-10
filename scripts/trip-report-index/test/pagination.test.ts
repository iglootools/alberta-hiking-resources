import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PAGE_SIZE, readAllPages } from '../sources/selfhosted-wordpress.ts'
import { jsonItems, stubFetcher } from './support.ts'

const urlOf = (page: number) => `https://wp.test/wp-json/wp/v2/posts?page=${page}`
const pageOf = (url: string) => Number(new URL(url).searchParams.get('page'))

describe('readAllPages', () => {
  it('ends on the 400 WordPress answers for a page past the end', async () => {
    const fetchText = stubFetcher(url => pageOf(url) <= 2 ? jsonItems(PAGE_SIZE) : 400)
    assert.equal((await readAllPages(fetchText, urlOf)).length, 2 * PAGE_SIZE)
    assert.equal(fetchText.urls.length, 3)
  })

  it('ends on a short page without asking for the next', async () => {
    const fetchText = stubFetcher(url => jsonItems(pageOf(url) === 1 ? PAGE_SIZE : 7))
    assert.equal((await readAllPages(fetchText, urlOf)).length, PAGE_SIZE + 7)
    assert.equal(fetchText.urls.length, 2)
  })

  it('fails on a server error partway through, rather than returning part of the archive', async () => {
    const fetchText = stubFetcher(url => pageOf(url) === 2 ? 500 : jsonItems(PAGE_SIZE))
    await assert.rejects(readAllPages(fetchText, urlOf), { name: 'HttpError', status: 500 })
  })

  it('fails when the page cap is reached without an end', async () => {
    await assert.rejects(
      readAllPages(stubFetcher(() => jsonItems(PAGE_SIZE)), urlOf),
      { name: 'PageLimitError', url: urlOf(1), limit: 50 }
    )
  })

  it('fails on a response that is not a JSON array', async () => {
    await assert.rejects(
      readAllPages(stubFetcher(() => '{"code":"rest_no_route"}'), urlOf),
      { name: 'SourceChangedError', source: urlOf(1) }
    )
  })
})
