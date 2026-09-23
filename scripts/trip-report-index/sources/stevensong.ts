/**
 * stevensong.com — WordPress, with the region encoded in the URL path as
 * `/{area}/{region}/{trip}/`. The alphabetical index supplies proper titles,
 * which are better than anything derivable from a slug.
 *
 * Only the Canadian Rockies, the Selkirks and Purcells, and Montana are in
 * scope; the archive is largely coastal BC, the US, and international.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import { anchors, sitemapLocations } from '../html.ts'
import { splitObjectives } from '../canon.ts'

const BASE = 'https://stevensong.com/'
const SITEMAP = `${BASE}sitemap.xml`
const ALPHABETICAL = `${BASE}alphabetical-list/`

/**
 * Which `/{area}/{region}/` pairs to read at all. Most of this archive is
 * coastal BC, the US, and international; filtering here rather than in
 * REGION_MAP keeps ~500 Washington and Fraser Valley trips from arriving as
 * objectives that look merely unplaced and would clog the curation list.
 */
const IN_SCOPE: Readonly<Record<string, readonly string[] | '*'>> = {
  'canadian-rockies': '*',
  'coastal-interior-bc': ['selkirk-mountains', 'purcell-mountains', 'sea-to-sky',
    'pemberton-onwards', 'north-shore-mountains', 'sunshine-coast', 'fraser-valley',
    'bc-cascades', 'okanagan', 'vancouver-island'],
  'usa': ['montana']
}

/** `/canadian-rockies/banff/mount-aylmer/` -> { region: 'banff' } */
function parse(url: URL): { region: string, slug: string } | undefined {
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length !== 3) return undefined
  const [area, region, slug] = segments as [string, string, string]
  const allowed = IN_SCOPE[area]
  if (!allowed || (allowed !== '*' && !allowed.includes(region))) return undefined
  return { region, slug }
}

export async function scrapeStevenSong(fetchText: Fetcher): Promise<RawReport[]> {
  const titles = new Map<string, string>()
  for (const anchor of anchors(await fetchText(ALPHABETICAL))) {
    if (!anchor.href.startsWith(BASE) || !anchor.text) continue
    titles.set(new URL(anchor.href).pathname.replace(/\/$/, ''), anchor.text)
  }

  const reports: RawReport[] = []
  for (const location of sitemapLocations(await fetchText(SITEMAP))) {
    const url = new URL(location)
    const parsed = parse(url)
    if (!parsed) continue

    const key = url.pathname.replace(/\/$/, '')
    const title = titles.get(key) ?? titleFromSlug(parsed.slug)
    reports.push({
      sourceId: 'stevensong',
      title,
      url: url.href,
      objectives: splitObjectives(title),
      sourceRegion: parsed.region
    })
  }
  return reports
}

function titleFromSlug(slug: string): string {
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}
