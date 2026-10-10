import assert from 'node:assert/strict'
import { readdir, rm } from 'node:fs/promises'
import { after, describe, it } from 'node:test'
import { createFetcher, fetchUnlessStatus } from '../fetch.ts'
import { stubFetcher, tempDir } from './support.ts'

describe('fetchUnlessStatus', () => {
  it('answers undefined for the expected status', async () => {
    assert.equal(await fetchUnlessStatus(stubFetcher(() => 404), 'https://x.test/a', 404), undefined)
  })

  it('rethrows any other HTTP status', async () => {
    await assert.rejects(
      fetchUnlessStatus(stubFetcher(() => 500), 'https://x.test/a', 404),
      { name: 'HttpError', status: 500, url: 'https://x.test/a' }
    )
  })

  it('rethrows failures that are not HTTP responses at all', async () => {
    const broken = async () => {
      throw new TypeError('fetch failed')
    }
    await assert.rejects(fetchUnlessStatus(broken, 'https://x.test/a', 404), TypeError)
  })
})

describe('createFetcher', async () => {
  const cacheDir = await tempDir()
  after(() => rm(cacheDir, { recursive: true, force: true }))

  // A clock that jumps a second per reading, so the throttle never sleeps.
  let tick = 0
  const now = () => (tick += 1000)

  it('turns a non-2xx response into an HttpError carrying its status', async () => {
    const fetchImpl = async () => new Response('', { status: 503, statusText: 'Unavailable' })
    await assert.rejects(
      createFetcher(cacheDir, { now, fetchImpl })('https://x.test/down'),
      { name: 'HttpError', status: 503, url: 'https://x.test/down' }
    )
  })

  it('serves a repeat request from the cache', async () => {
    let calls = 0
    const fetchImpl = async () => {
      calls += 1
      return new Response('hello')
    }
    const fetchText = createFetcher(cacheDir, { now, fetchImpl })
    assert.equal(await fetchText('https://x.test/cached'), 'hello')
    assert.equal(await fetchText('https://x.test/cached'), 'hello')
    assert.equal(calls, 1)
  })

  it('does not cache a failure', async () => {
    const before = (await readdir(cacheDir)).length
    const fetchImpl = async () => new Response('', { status: 500 })
    await assert.rejects(createFetcher(cacheDir, { now, fetchImpl })('https://x.test/fails'))
    assert.equal((await readdir(cacheDir)).length, before)
  })

  it('decodes windows-1252 declared only in a meta tag', async () => {
    const body = Buffer.concat([
      Buffer.from('<meta charset="windows-1252">Mont '),
      Buffer.from([0xE9]) // é in windows-1252, invalid on its own in UTF-8
    ])
    const fetchImpl = async () => new Response(body, { headers: { 'content-type': 'text/html' } })
    assert.match(await createFetcher(cacheDir, { now, fetchImpl })('https://x.test/1252'), /Mont é$/)
  })
})
