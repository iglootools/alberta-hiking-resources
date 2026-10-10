import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readUploads, requireApiKey } from '../sources/annie.ts'
import { scrapeBillKerr } from '../sources/billkerr.ts'
import { scrapeCoastBackcountry } from '../sources/coastbackcountry.ts'
import { readWordPress } from '../sources/wordpress.ts'
import { stubFetcher } from './support.ts'

describe('requireApiKey', () => {
  it('returns the key from the environment it is given', () => {
    assert.equal(requireApiKey({ YOUTUBE_API_KEY: 'k' }), 'k')
  })

  it('fails naming the missing variable', () => {
    assert.throws(() => requireApiKey({}), { name: 'MissingCredentialError', variable: 'YOUTUBE_API_KEY' })
  })
})

describe('readUploads', () => {
  const channel = JSON.stringify({ items: [{ contentDetails: { relatedPlaylists: { uploads: 'UU1' } } }] })
  const video = (title: string, videoId: string) => ({ snippet: { title, resourceId: { videoId } } })

  it('follows page tokens to the end of the playlist', async () => {
    const fetchText = stubFetcher((url) => {
      if (url.includes('/channels?')) return channel
      return url.includes('pageToken=P2')
        ? JSON.stringify({ items: [video('Second', 'b')] })
        : JSON.stringify({ items: [video('First', 'a')], nextPageToken: 'P2' })
    })
    assert.deepEqual(await readUploads(fetchText, 'k'), [
      { title: 'First', videoId: 'a' },
      { title: 'Second', videoId: 'b' }
    ])
  })

  it('surfaces an error the API reports in a 2xx body', async () => {
    const fetchText = stubFetcher(() => JSON.stringify({ error: { message: 'API key not valid' } }))
    await assert.rejects(readUploads(fetchText, 'k'),
      { name: 'ApiError', api: 'YouTube channels', detail: 'API key not valid' })
  })

  it('fails when the channel has no uploads playlist', async () => {
    await assert.rejects(readUploads(stubFetcher(() => '{"items":[]}'), 'k'),
      { name: 'SourceChangedError', source: 'annie' })
  })
})

describe('readWordPress', () => {
  it('surfaces an error the API reports in a 2xx body', async () => {
    const fetchText = stubFetcher(() => JSON.stringify({ error: 'unknown_blog', message: 'Unknown blog' }))
    await assert.rejects(readWordPress(fetchText, 'gone.wordpress.com', 'post'),
      { name: 'ApiError', api: 'WordPress.com gone.wordpress.com', detail: 'unknown_blog Unknown blog' })
  })
})

describe('category lookups', () => {
  it('fails when Bill Kerr has no outing categories left', async () => {
    await assert.rejects(scrapeBillKerr(stubFetcher(() => '[]')),
      { name: 'SourceChangedError', source: 'billkerr' })
  })

  it('fails when a Coast Backcountry category has gone', async () => {
    await assert.rejects(scrapeCoastBackcountry(stubFetcher(() => '[]')),
      { name: 'SourceChangedError', source: 'coastbackcountry' })
  })
})
