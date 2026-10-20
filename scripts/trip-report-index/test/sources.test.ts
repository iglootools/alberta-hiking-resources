import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readUploads, requireApiKey } from '../sources/annie.ts'
import { objectivesOf, relatedLinks } from '../sources/anugara.ts'
import { trailheadOf } from '../sources/ontop.ts'
import { scrapeStevenSong } from '../sources/stevensong.ts'
import { regionFromTags, scrapeBillKerr } from '../sources/billkerr.ts'
import { regionOfLocality, scrapeSpectacularMountains, siteLinks, tripLocality } from '../sources/spectacularmountains.ts'
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

describe('tripLocality (Spectacular Mountains)', () => {
  it('reads the locality before the date', () => {
    assert.equal(tripLocality('Elkford, BC, Canada 24 September 2021 Solo Beautiful ridge walk'), 'Elkford, BC, Canada')
  })

  it('accepts a span of days and the ISO date one page uses', () => {
    assert.equal(tripLocality('Castle, AB, Canada 26 & 27 July 2020 With Don'), 'Castle, AB, Canada')
    assert.equal(tripLocality('Kananaskis, AB, Canada Winter ascent (attempt) on 2019-10-06'), 'Kananaskis, AB, Canada Winter ascent (attempt) on')
  })

  it('gives an empty locality for an older trip that opens with its date', () => {
    assert.equal(tripLocality('31 July 2017 With Wen Beehive Mountain was a brilliant outing'), '')
  })

  it('finds no trip on a page that does not open with a date', () => {
    assert.equal(tripLocality('Hi – my name is Cornelius and this is my personal site, started in 2015 or so'), undefined)
  })
})

describe('regionOfLocality (Spectacular Mountains)', () => {
  it('resolves a Canadian locality through the shared matcher', () => {
    assert.equal(regionOfLocality('Mount Robson Prov. Park, BC, Canada'), 'jasper-robson')
  })

  it('passes a Canadian locality the matcher does not know to the region map', () => {
    assert.equal(regionOfLocality('Castle, AB, Canada'), 'locality:Castle')
  })

  it('puts a locality abroad out of scope, whatever words it contains', () => {
    assert.equal(regionOfLocality('Svaneti, Georgia (Caucasus)'), 'elsewhere')
    assert.equal(regionOfLocality('Gaspésie, Quebec'), 'elsewhere')
  })

  it('has nothing to say about an empty locality', () => {
    assert.equal(regionOfLocality(''), undefined)
  })
})

describe('scrapeSpectacularMountains', () => {
  const page = (link: string, title: string, content: string) => ({ link, title: { rendered: title }, content: { rendered: `<p>${content}</p>` } })

  it('keeps trips, placed by path or locality, and drops pages that are not trips', async () => {
    const fetchText = stubFetcher(() => JSON.stringify([
      page('https://s/canada/ghost/castle-rock/', 'Castle Rock', 'Ghost, AB, Canada 3 June 2021 Solo'),
      page('https://s/gaff-peak/', 'Gaff Peak', 'Elkford, BC, Canada 24 September 2021 Solo'),
      page('https://s/puigmal/', 'Puigmal', 'Pyrenees, Spain 8 June 2018 With Wen'),
      page('https://s/contact/', 'Contact', 'If you would like to get in touch with feedback'),
      page('https://s/aaa-trip-template/', 'AAA Trip Template', 'Kananaskis, Canada 13 November 2020 Solo')
    ]))
    const reports = await scrapeSpectacularMountains(fetchText)
    assert.deepEqual(reports.map(report => [report.title, report.sourceRegion]), [
      ['Castle Rock', 'canada/ghost'],
      ['Gaff Peak', 'bc-rockies-purcells'],
      ['Puigmal', 'elsewhere']
    ])
  })
})

describe('siteLinks (Spectacular Mountains)', () => {
  it('keeps links to the site\u2019s other pages, once each, without fragments', () => {
    const html = '<a href="/gould-dome/">Gould Dome</a> <a href="https://s.com/mount-erris/#top">Erris</a>'
      + ' <a href="/gould-dome/">again</a> <a href="https://s.com/funnel-peak/">itself</a>'
      + ' <a href="https://s.com/">home</a> <a href="https://s.com/wp-content/uploads/a.jpg">photo</a>'
      + ' <a href="https://peakbagger.com/x">elsewhere</a>'
    assert.deepEqual(siteLinks(html, 'https://s.com/funnel-peak/'), ['https://s.com/gould-dome/', 'https://s.com/mount-erris/'])
  })
})

describe('regionFromTags (Bill Kerr)', () => {
  it('places a post by the one area its tags name, ignoring tags that are not places', () => {
    assert.equal(regionFromTags(['alberta', 'ridge', 'Kananaskis', 'snow']), 'kananaskis-canmore')
  })

  it('reads the tags the shared matcher cannot take', () => {
    assert.equal(regionFromTags(['Castle']), 'crowsnest-castle')
  })

  it('places nothing when the tags disagree', () => {
    assert.equal(regionFromTags(['Banff', 'Kananaskis']), undefined)
  })
})

describe('scrapeBillKerr', () => {
  const post = (id: number, title: string, tags: number[]) => ({ link: `https://b/${id}`, title: { rendered: title }, tags })

  it('cleans titles, places posts by their tags, and drops what is not an outing', async () => {
    const fetchText = stubFetcher((url) => {
      if (url.includes('/categories?')) return JSON.stringify([{ id: 1, name: 'scramble' }])
      if (url.includes('/tags?')) return JSON.stringify([{ id: 5, name: 'Kananaskis' }, { id: 6, name: 'Castle' }])
      return JSON.stringify([
        post(1, 'Scramble Chester Mountain Sept 3, 2022', [5]),
        post(2, 'Table Mountain in Castle area June 25, 2022', [6]),
        post(3, 'Ski up to Wawa Sunshine Jan 2021', []),
        post(4, 'Mount Sarrail Scamble Sept 1, 2018', [5]),
        post(5, 'Baofeng UV-5R Tactical Folding Antenna Test March 20, 2020', [])
      ])
    })
    const reports = await scrapeBillKerr(fetchText)
    assert.deepEqual(reports.map(report => [report.title, report.sourceRegion]), [
      ['Chester Mountain', 'kananaskis-canmore'],
      ['Table Mountain', 'crowsnest-castle'],
      ['Ski up to Wawa Sunshine', 'banff'],
      ['Mount Sarrail', 'kananaskis-canmore']
    ])
  })
})
