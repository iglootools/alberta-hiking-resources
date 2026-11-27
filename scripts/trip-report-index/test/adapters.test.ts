/**
 * One test per source adapter's scrape, over trimmed copies of the pages each
 * reads. The guard against a site redesign is the source's minimum, which only
 * a live run reaches; these catch a parser change that would empty a source.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { RawReport } from '../types.ts'
import { scrapeAdamLaycock } from '../sources/adamlaycock.ts'
import { scrapeAnugara } from '../sources/anugara.ts'
import { scrapeExplor8ion } from '../sources/explor8ion.ts'
import { scrapeGoldenScrambles } from '../sources/goldenscrambles.ts'
import { scrapeOnTop } from '../sources/ontop.ts'
import { scrapeSonnyBou } from '../sources/sonnybou.ts'
import { scrapeSpirko } from '../sources/spirko.ts'
import { scrapeVirtualHiker } from '../sources/virtualhiker.ts'
import { stubFetcher } from './support.ts'

/** A fetcher answering each URL from `pages`, and 404 for any other. */
const site = (pages: Readonly<Record<string, string>>) => stubFetcher(url => pages[url] ?? 404)

const placed = (reports: readonly RawReport[]) => reports.map(report => [report.title, report.sourceRegion])

describe('scrapeSpirko', () => {
  it('places a report by its path, or by the locality line in its own header', async () => {
    const index = '<a href="http://bobspirko.ca/Hiking/Hiking.htm" class="topline">Hiking</a>'
      + '<td><span class="body"><a href="../Hiking/Kananaskis/AllsmokeMtn/Allsmoke.html">Allsmoke Mountain</a></span></td>'
      + '<td><span class="body"><a href="BeaverRidge/BeaverRidge.html">&Icirc;yarhe &Icirc;pan</a></span></td>'
      + '<a href="http://bobspirko.ca/map.html">Map</a>'
    const report = '<p><span class="heading">&Icirc;yarhe &Icirc;pan</span><br />'
      + '<span class="body">Kananaskis, Alberta<br />August 15, 2006</span></p>'
    const reports = await scrapeSpirko(site({
      'http://bobspirko.ca/OtherScrambles/canada.html': index,
      'http://bobspirko.ca/Hiking/Hiking.htm': '',
      'http://bobspirko.ca/Snowshoe/Snowshoe.htm': '',
      'http://bobspirko.ca/USTrips/UStrips.htm': '',
      'http://bobspirko.ca/OtherScrambles/BeaverRidge/BeaverRidge.html': report
    }))
    assert.deepEqual(placed(reports), [['Allsmoke Mountain', 'Kananaskis'], ['Îyarhe Îpan', 'kananaskis-canmore']])
  })
})

describe('scrapeExplor8ion', () => {
  it('reads region pages, without the favourite mark, then the trips they omit', async () => {
    const region = '<li><a class="title" href="/trips/north-highwood-peak-mist-hills/">North Highwood Peak (+ Mist Hills)</a>'
      + '<p class="where">Aug 25, Highwood Range<span class="fav" title="A favourite">★</span></p></li>'
    const sitemap = '<urlset><url><loc>https://explor8ion.com/trips/north-highwood-peak-mist-hills/</loc></url>'
      + '<url><loc>https://explor8ion.com/trips/misty-mount/</loc></url>'
      + '<url><loc>https://explor8ion.com/trips/1234/</loc></url></urlset>'
    const reports = await scrapeExplor8ion(site({
      'https://explor8ion.com/regions/': '<a href="/regions/kananaskis-country/">Kananaskis Country</a>',
      'https://explor8ion.com/regions/kananaskis-country/': region,
      'https://explor8ion.com/sitemap-0.xml': sitemap,
      'https://explor8ion.com/trips/misty-mount/': '<p>July 4, 2007, Misty Range Summit 2912 m</p>'
    }))
    assert.deepEqual(reports.map(report => [report.objectives, report.sourceRegion, report.subRange]), [
      [['North Highwood Peak', 'Mist Hills'], 'kananaskis-country', 'Highwood Range'],
      [['Misty Mount'], undefined, 'Misty Range']
    ])
  })
})

describe('scrapeGoldenScrambles', () => {
  it('places summits from the region map, then from the area field of those it does not list', async () => {
    const summit = (area: string) => `<p>area: ${area}</p><p>map</p>`
    const reports = await scrapeGoldenScrambles(site({
      'http://goldenscrambles.ca/regions.html': '<map><area shape="poly" alt="Golden" href="http://goldenscrambles.ca/regions/golden.html"></map>',
      'http://goldenscrambles.ca/regions/golden.html': '<a href="../summits/abbott/abbott.html">Abbott, Mount</a>',
      'http://goldenscrambles.ca/alphalog.html': '<a href="summits/abbott/abbott.html">Abbott, Mount</a>'
        + '<a href="summits/begbie/begbie.html">Begbie, Mount</a>'
        + '<a href="summits/quandary/quandary.html">Quandary Peak</a>'
        + '<a href="summits/gone/gone.html">Gone Peak</a>',
      'http://goldenscrambles.ca/summits/begbie/begbie.html': summit('Revelstoke,BC'),
      'http://goldenscrambles.ca/summits/quandary/quandary.html': summit('Breckenridge,Colorado,USA')
    }))
    assert.deepEqual(placed(reports), [
      ['Abbott, Mount', 'golden'],
      ['Begbie, Mount', 'rogers-pass-selkirks'],
      ['Gone Peak', undefined]
    ])
  })
})

describe('scrapeSonnyBou', () => {
  it('reads the summit table, placing each row by its location and dropping those abroad', async () => {
    const row = (href: string, summit: string, location: string) =>
      `<tr><td><a href="${href}">${summit}</a></td><td>${location}</td></tr>`
    const table = '<table><tr><td>SUMMIT</td><td>LOCATION</td></tr>'
      + row('ssbou2016/iyarheipan.html', 'Iyarhe Ipan', 'Kananaskis, AB')
      + row('ssbou2019/wheeler.html', 'Wheeler Peak', 'Great Basin National Park, NV')
      + row('ssbou2018/reynolds.html', 'Reynolds, Mount', 'Glacier National Park, MT')
      + '</table>'
    const reports = await scrapeSonnyBou(site({ 'https://sonnybou.ca/scrambles/': table }))
    assert.deepEqual(reports.map(report => [report.url, report.sourceRegion]), [
      ['https://sonnybou.ca/scrambles/ssbou2016/iyarheipan.html', 'kananaskis-canmore'],
      ['https://sonnybou.ca/scrambles/ssbou2018/reynolds.html', 'glacier-montana']
    ])
  })
})

describe('scrapeAdamLaycock', () => {
  it('reads routes in either casing from the content index, placed by each page’s Region', async () => {
    const index = JSON.stringify({
      'Routes/Akamina-Ridge': { title: 'Akamina Ridge' },
      'routes/ha-ling-peak': { title: 'Ha Ling Peak' },
      'routes/index': { title: 'Routes' },
      'lists/kane-scrambles': { title: 'Kane Scrambles' }
    })
    const stat = (value: string, name: string) =>
      `<div class="meta-stat"><span class="meta-stat-value">${value}</span><span class="meta-stat-name">${name}</span></div>`
    const reports = await scrapeAdamLaycock(site({
      'https://adamlaycock.ca/static/contentIndex.json': index,
      'https://adamlaycock.ca/Routes/Akamina-Ridge': stat('2514 m', 'Summit elevation') + stat('Waterton', 'Region'),
      'https://adamlaycock.ca/routes/ha-ling-peak': stat('Canmore', 'Region')
    }))
    assert.deepEqual(placed(reports), [['Akamina Ridge', 'waterton'], ['Ha Ling Peak', 'kananaskis-canmore']])
  })
})

describe('scrapeVirtualHiker', () => {
  it('takes the region from the one category its map knows, and none from the rest', async () => {
    const posts = [
      { title: 'Prairie Mountain', URL: 'https://v/prairie', categories: { 'Hiking': {}, 'Kananaskis Region': {} } },
      { title: 'Cycling the Legacy Trail', URL: 'https://v/legacy', categories: { Cycling: {} } }
    ]
    const reports = await scrapeVirtualHiker(stubFetcher(() => JSON.stringify({ found: 2, posts })))
    assert.deepEqual(placed(reports), [['Prairie Mountain', 'Kananaskis Region'], ['Cycling the Legacy Trail', undefined]])
  })
})

describe('scrapeOnTop', () => {
  it('reads both indexes, drops the date from a title, and reads each trailhead', async () => {
    const reports = await scrapeOnTop(site({
      'https://www.on-top.ca/Index-Summits.html': '<a href="Outings/2020/Iyarhe-Ipan-May-2020.html">Iyarhe Ipan May 2020</a>'
        + '<a href="https://example.com/">Elsewhere</a>',
      'https://www.on-top.ca/Index-Hikes.html': '<a href="Outings/2019/Gone.html">Gone Hike - June, 2019</a>',
      'https://www.on-top.ca/Outings/2020/Iyarhe-Ipan-May-2020.html':
        '<a href="https://www.google.com/maps/place/X/@51.06,-115.4,15z/data=!3d51.0336!4d-115.3953">Parking</a>'
    }))
    assert.deepEqual(reports.map(report => [report.title, report.trailhead]), [
      ['Iyarhe Ipan', { lat: 51.0336, lon: -115.3953 }],
      ['Gone Hike', undefined]
    ])
  })
})

describe('scrapeAnugara', () => {
  it('reads his own reports off the log, with the reports each links to', async () => {
    const log = '<a href="middlesister2.html">Middle Sister II and The Orphan</a> Aug 2, 2020<br>'
      + '<a href="https://peaksandstreams.com/haig/">Mount Haig</a><br>'
      + '<a href="index.html">Home</a> <a href="iii.html">III</a>'
    const reports = await scrapeAnugara(site({
      'https://anugara.net/log.html': log,
      'https://anugara.net/middlesister2.html': '<a href="orphan.html">The Orphan</a> <a href="log.html">Log</a>'
    }))
    assert.deepEqual(reports.map(report => [report.objectives, report.relatedUrls]), [
      [['Middle Sister', 'The Orphan'], ['https://anugara.net/orphan.html']]
    ])
  })
})
