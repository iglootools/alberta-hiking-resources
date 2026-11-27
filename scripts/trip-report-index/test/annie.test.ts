import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { scrapeAnnie } from '../sources/annie.ts'
import { readCredentials } from '../sources/index.ts'
import { stubFetcher } from './support.ts'

describe('readCredentials', () => {
  it('reads the YouTube key from the environment it is given', () => {
    assert.deepEqual(readCredentials({ YOUTUBE_API_KEY: 'k' }), { youtubeApiKey: 'k' })
  })

  it('fails naming the missing variable', () => {
    assert.throws(() => readCredentials({}), { name: 'MissingCredentialError', variable: 'YOUTUBE_API_KEY' })
  })
})

describe('scrapeAnnie', () => {
  it('reads the channel with the key it is given, keeping only trip videos', async () => {
    const fetchText = stubFetcher(url => url.includes('/channels?')
      ? JSON.stringify({ items: [{ contentDetails: { relatedPlaylists: { uploads: 'UU1' } } }] })
      : JSON.stringify({ items: [
          { snippet: { title: 'Takakkaw Peak, Yoho National Park, BC - July 18th 2026', resourceId: { videoId: 'a' } } },
          { snippet: { title: 'Hiking season 2024 montage', resourceId: { videoId: 'b' } } }
        ] }))
    const reports = await scrapeAnnie(fetchText, { youtubeApiKey: 'given-key' })
    assert.ok(fetchText.urls.every(url => url.includes('key=given-key')))
    assert.deepEqual(reports.map(report => [report.url, report.objectives]),
      [['https://www.youtube.com/watch?v=a', ['Takakkaw Peak']]])
  })
})
