import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseTitle, scrapeAnnie } from '../sources/annie.ts'
import { readCredentials } from '../sources/index.ts'
import { stubFetcher } from './support.ts'

// Real titles from the channel, unless marked otherwise.
describe('parseTitle', () => {
  it('reads the objective and the area from a dated title', () => {
    assert.deepEqual(parseTitle('Takakkaw Peak, Yoho National Park, BC - July 18th 2026'),
      { objectives: ['Takakkaw Peak'], area: 'yoho' })
  })

  it('reads a title with no date, stripping the activity', () => {
    assert.deepEqual(parseTitle('Sarrail ridge summit loop via Rawson Lake'),
      { objectives: ['Sarrail ridge summit'], area: undefined })
  })

  it('strips trailing activities and companions down to the name', () => {
    assert.deepEqual(parseTitle('Mount Temple scramble - Sept 1st 2024')?.objectives, ['Mount Temple'])
    assert.deepEqual(parseTitle('HaLing Peak with my friends - Oct 24th 2021')?.objectives, ['HaLing Peak'])
  })

  it('keeps "summit" when it is part of the name', () => {
    assert.deepEqual(parseTitle('Ship\'s Prow Mountain true summit - Sept 14th 2024')?.objectives,
      ['Ship\'s Prow Mountain true summit'])
  })

  it('drops tributes, montages and camps', () => {
    assert.equal(parseTitle('Kidoo our Angel  September 18 2010 - May 5 2024'), undefined)
    assert.equal(parseTitle('2021 hikes montage / Alberta & BC'), undefined)
    assert.equal(parseTitle('Wenatchee Wild Junior A camp - April 28-30th 2023'), undefined)
  })

  it('splits a multi-objective day on her slashes, dropping place names and bare activities', () => {
    assert.deepEqual(parseTitle('Door Jamb/ Loder peak/ Jura creek loop/ June 25th 2022')?.objectives,
      ['Door Jamb', 'Loder peak', 'Jura creek'])
    assert.deepEqual(parseTitle('Cox Hill Ridge / Sibbald flats / Kananaskis Country/ AB /Jan 10th 2021')?.objectives,
      ['Cox Hill Ridge', 'Sibbald flats'])
    assert.deepEqual(parseTitle('Ship\'s prow mountain hike/scramble - Feb 12th 2022')?.objectives,
      ['Ship\'s prow mountain'])
  })

  it('reads a date written without spaces', () => {
    assert.deepEqual(parseTitle('Prairie View/Jewell Pass loop Sunrise Jan23rd2021')?.objectives,
      ['Prairie View', 'Jewell Pass'])
  })

  it('reads the area from its own field', () => {
    assert.deepEqual(parseTitle('Rogan Peak/Dungarvan SE2, Waterton Lakes National Park, AB - May 17th 2025'),
      { objectives: ['Rogan Peak', 'Dungarvan SE2'], area: 'waterton' })
  })

  it('reads the area from prose when no field names one', () => {
    assert.deepEqual(parseTitle('Crypt lake hike in Waterton, AB - July 24th 2022'),
      { objectives: ['Crypt lake'], area: 'waterton' })
  })

  it('leaves "in" alone when what follows is not an area (a constructed title)', () => {
    assert.deepEqual(parseTitle('Hole in the Wall hike, Alberta - June 1st 2022')?.objectives, ['Hole in the Wall'])
  })
})

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
