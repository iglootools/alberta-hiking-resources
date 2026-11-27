import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { anchors, decodeEntities, sitemapLocations, tableRows } from '../html.ts'

describe('decodeEntities', () => {
  it('keeps the case of an accented letter', () => {
    assert.equal(decodeEntities('&Icirc;yarhe &icirc;pan'), 'Îyarhe îpan')
    assert.equal(decodeEntities('&Agrave; la carte'), 'À la carte')
  })

  it('decodes decimal and hexadecimal references', () => {
    assert.equal(decodeEntities('Caf&#233; &#x2013; &#X41;'), 'Café – A')
  })

  it('leaves alone a reference that names no character, and a name it does not know', () => {
    assert.equal(decodeEntities('&#99999999; &#x110000; &bogus;'), '&#99999999; &#x110000; &bogus;')
  })
})

describe('anchors', () => {
  it('finds href wherever it sits, in either quotes, decoding it and flattening the text', () => {
    const html = '<a class="t" href="/a?x=1&amp;y=2"><b>Mount</b>&nbsp;Rae</a> <a href=\'/b\' id="z">B</a> <a name="top">no link</a>'
    assert.deepEqual([...anchors(html)].map(({ href, text }) => [href, text]), [['/a?x=1&y=2', 'Mount Rae'], ['/b', 'B']])
  })
})

describe('sitemapLocations', () => {
  it('lists the pages, decoded, and leaves out uploaded files', () => {
    const xml = '<urlset><url><loc> https://s/a?p=1&amp;q=2 </loc></url>'
      + '<url><loc>https://s/wp-content/uploads/x.jpg</loc></url></urlset>'
    assert.deepEqual(sitemapLocations(xml), ['https://s/a?p=1&q=2'])
  })
})

describe('tableRows', () => {
  it('gives each row’s cells as HTML, header cells included', () => {
    const html = '<table><tr><th>Trip</th><th>Grade</th></tr><tr class="r"><td><a href="/x">X</a></td><td>Easy</td></tr></table>'
    assert.deepEqual(tableRows(html), [['Trip', 'Grade'], ['<a href="/x">X</a>', 'Easy']])
  })
})
