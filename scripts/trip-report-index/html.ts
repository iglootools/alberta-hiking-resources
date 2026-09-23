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
 * Lookup is case-sensitive first, because &Icirc; and &icirc; differ.
 */
const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '\u0027', nbsp: ' ',
  Icirc: '\u00ce', icirc: '\u00ee', Acirc: '\u00c2', acirc: '\u00e2',
  Ecirc: '\u00ca', ecirc: '\u00ea', Ocirc: '\u00d4', ocirc: '\u00f4',
  Ucirc: '\u00db', ucirc: '\u00fb',
  eacute: '\u00e9', Eacute: '\u00c9', egrave: '\u00e8', agrave: '\u00e0',
  uuml: '\u00fc', ouml: '\u00f6', auml: '\u00e4', ccedil: '\u00e7',
  ntilde: '\u00f1', deg: '\u00b0', rsquo: '\u2019', lsquo: '\u2018',
  ldquo: '\u201c', rdquo: '\u201d', ndash: '\u2013', mdash: '\u2014'
}

export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, name: string) => {
    const known = ENTITIES[name] ?? ENTITIES[name.toLowerCase()]
    if (known !== undefined) return known
    if (name.startsWith('#x') || name.startsWith('#X')) return String.fromCodePoint(parseInt(name.slice(2), 16))
    if (name.startsWith('#')) return String.fromCodePoint(Number(name.slice(1)))
    return match
  })
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
