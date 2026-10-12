import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readUploads, requireApiKey } from '../sources/annie.ts'
import { objectivesOf, relatedLinks } from '../sources/anugara.ts'
import { trailheadOf } from '../sources/ontop.ts'
import { scrapeStevenSong } from '../sources/stevensong.ts'
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

describe('relatedLinks', () => {
  const page = 'https://anugara.net/middlesister.htm'

  it('keeps his other reports, resolved and once each', () => {
    const html = '<a href="orphan2.html">The Orphan</a> <a href="windridge.html#top">Wind</a> <a href="windridge.html">Wind</a>'
    assert.deepEqual(relatedLinks(html, page), ['https://anugara.net/orphan2.html', 'https://anugara.net/windridge.html'])
  })

  it('drops the log, the page itself, images and other sites', () => {
    const html = '<a href="log.html">Log</a><a href="middlesister.htm">Self</a><a href="p.jpg">Photo</a>'
      + '<a href="http://members.shaw.ca/anugara/index.htm">Old home</a>'
    assert.deepEqual(relatedLinks(html, page), [])
  })
})

describe('trailheadOf', () => {
  it('reads the pin, not the viewport, from a Google Maps link', () => {
    const html = '<a href="https://www.google.com/maps/place/X/@51.06,-115.64,45188m/data=!3m1!8m2!3d51.1151858!4d-115.7632758">Parking</a>'
    assert.deepEqual(trailheadOf(html), { lat: 51.1151858, lon: -115.7632758 })
  })

  it('falls back to the viewport when there is no pin', () => {
    assert.deepEqual(trailheadOf('<a href="https://www.google.ca/maps/@49.59,-119.67,3276m">Map</a>'), { lat: 49.59, lon: -119.67 })
  })

  it('finds nothing on a page with no map link', () => {
    assert.equal(trailheadOf('<a href="https://example.com/">Elsewhere</a>'), undefined)
  })
})

describe('objectivesOf (Andrew Nugara)', () => {
  it('drops the visit number, so a repeat merges with the first visit', () => {
    assert.deepEqual(objectivesOf('Prairie Bluff XXI'), ['Prairie Bluff'])
    assert.deepEqual(objectivesOf('"Woody V"'), ['Woody'])
    assert.deepEqual(objectivesOf('Sofa Mountain recon. III'), ['Sofa Mountain'])
    assert.deepEqual(objectivesOf('Mount Birdwood attempt IV and "Sepia Ridge"'), ['Mount Birdwood', 'Sepia Ridge'])
  })

  it('splits a day\u2019s objectives on commas and "and"', () => {
    assert.deepEqual(objectivesOf('Middle Sister II and The Orphan'), ['Middle Sister', 'The Orphan'])
    assert.deepEqual(objectivesOf('Mount Dungarvan IV, Dundy Peak III, and Cloudy Ridge'), ['Mount Dungarvan', 'Dundy Peak', 'Cloudy Ridge'])
    assert.deepEqual(objectivesOf('"Table Top Peak II and Whistable II"'), ['Table Top Peak', 'Whistable'])
  })

  it('drops the route, asides, and fragments that are not objectives', () => {
    assert.deepEqual(objectivesOf('Mount Baldy XV: West Peak via Northwest Ridge'), ['Mount Baldy'])
    assert.deepEqual(objectivesOf('Prairie Fire IV - "Sleeping Princess" route'), ['Prairie Fire'])
    assert.deepEqual(objectivesOf('Gap Peak III (via climbing route, and southwest ridge)'), ['Gap Peak'])
    assert.deepEqual(objectivesOf('"Olympic Summit" and a little beyond'), ['Olympic Summit'])
    assert.deepEqual(objectivesOf('Pincher Ridge Centre III, Southwest II, and Victoria Ridge'), ['Pincher Ridge Centre', 'Victoria Ridge'])
    assert.deepEqual(objectivesOf('IX attempt'), [])
  })

  it('keeps grid references and hyphenated names', () => {
    assert.deepEqual(objectivesOf('GR435427 (northeast of Mount Bryant)'), ['GR435427'])
    assert.deepEqual(objectivesOf('Carthew Minor-Minor III'), ['Carthew Minor-Minor'])
  })
})

describe('scrapeStevenSong', () => {
  it('reads reports the capped sitemap no longer lists', async () => {
    const list = '<a href="https://stevensong.com/canadian-rockies/banff/mount-aylmer/">Mount Aylmer</a>'
      + '<a href="https://stevensong.com/usa/washington/mount-baker/">Mount Baker</a>'
    const sitemap = '<urlset><url><loc>https://stevensong.com/canadian-rockies/jasper/pyramid-mountain/</loc></url></urlset>'
    const reports = await scrapeStevenSong(stubFetcher(url => url.endsWith('sitemap.xml') ? sitemap : list))
    assert.deepEqual(reports.map(report => [report.title, report.sourceRegion]).sort(),
      [['Mount Aylmer', 'banff'], ['Pyramid Mountain', 'jasper']])
  })
})
