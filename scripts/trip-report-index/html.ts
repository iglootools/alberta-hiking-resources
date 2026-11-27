/**
 * Minimal HTML helpers.
 *
 * These sources are hand-written or template-generated pages with stable
 * markup, so targeted regexes are enough and keep the script dependency-free.
 * The safety net is not parser strictness but the per-source minimum counts in
 * sources/index.ts: a redesign that breaks an extractor makes the run fail
 * rather than quietly emptying a page.
 */

/**
 * Named entities these sources actually use. The accented ones matter: Bob
 * Spirko writes Stoney place names as "&Icirc;yarhe &Icirc;pan", and leaving
 * those undecoded turns the objective's name into "icirc yarhe icirc pan".
 * Lookup is case-sensitive, as in HTML: &Icirc; and &icirc; differ, so each
 * accented letter is listed in both cases.
 */
const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '\u0027', nbsp: ' ',
  // HTML defines these four in capitals too, unlike the rest.
  AMP: '&', LT: '<', GT: '>', QUOT: '"',
  Icirc: '\u00ce', icirc: '\u00ee', Acirc: '\u00c2', acirc: '\u00e2',
  Ecirc: '\u00ca', ecirc: '\u00ea', Ocirc: '\u00d4', ocirc: '\u00f4',
  Ucirc: '\u00db', ucirc: '\u00fb',
  eacute: '\u00e9', Eacute: '\u00c9', egrave: '\u00e8', Egrave: '\u00c8',
  agrave: '\u00e0', Agrave: '\u00c0',
  uuml: '\u00fc', Uuml: '\u00dc', ouml: '\u00f6', Ouml: '\u00d6',
  auml: '\u00e4', Auml: '\u00c4', ccedil: '\u00e7', Ccedil: '\u00c7',
  ntilde: '\u00f1', Ntilde: '\u00d1', deg: '\u00b0', rsquo: '\u2019', lsquo: '\u2018',
  ldquo: '\u201c', rdquo: '\u201d', ndash: '\u2013', mdash: '\u2014'
}

/** The largest Unicode code point; a numeric reference past it names no character. */
const MAX_CODE_POINT = 0x10FFFF

/**
 * Decodes the named entities in ENTITIES and every numeric reference. Anything
 * else is left as written: an unknown name, or a number that is no character
 * at all, which `String.fromCodePoint` would otherwise throw on with nothing
 * saying which page held it.
 */
export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, name: string) => {
    if (!name.startsWith('#')) return ENTITIES[name] ?? match
    const codePoint = /^#x/i.test(name) ? parseInt(name.slice(2), 16) : Number(name.slice(1))
    return codePoint <= MAX_CODE_POINT ? String.fromCodePoint(codePoint) : match
  })
}

/**
 * The month names, as a regex alternation, for the dates sources put in their
 * titles and headers. Capitalised: a source that writes them otherwise is
 * matched with the `i` flag.
 */
export const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'

/** The months' three-letter forms, as MONTHS; follow with `[a-z]*` to accept "Sept" or the full name too. */
export const MONTH_ABBREVIATIONS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec'

/**
 * The cells of every table row in `html`, each as its inner HTML so links
 * survive, header cells included. Nested tables are not handled; none of the
 * pages read has one.
 */
export function tableRows(html: string): string[][] {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(row => [...(row[1] ?? '').matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => cell[1] ?? ''))
}

/** Strips tags and collapses whitespace, including the &nbsp; these sites favour. */
export function textOf(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

export interface Anchor {
  readonly href: string
  readonly text: string
  readonly attrs: string
}

/** Yields every anchor, regardless of where `href` sits among the attributes. */
export function* anchors(html: string): Generator<Anchor> {
  for (const match of html.matchAll(/<a\b([^>]*?)>([\s\S]*?)<\/a>/gi)) {
    const attrs = match[1] ?? ''
    const href = /href\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? /href\s*=\s*'([^']*)'/i.exec(attrs)?.[1]
    if (!href) continue
    yield { href: decodeEntities(href), text: textOf(match[2] ?? ''), attrs }
  }
}

/** Extracts `<loc>` values from a sitemap, ignoring image and video children. */
export function sitemapLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(match => decodeEntities(match[1]!.trim()))
    .filter(url => !url.includes('/wp-content/'))
}
