/**
 * Annie Ouellet's YouTube channel — trip videos rather than written reports.
 *
 * Read through the official YouTube Data API, not by scraping: YouTube's
 * robots.txt disallows both `/youtubei/` (the endpoint the channel page's own
 * pagination uses) and `/feeds/videos.xml`, which leaves only the newest 30 of
 * 270-odd videos reachable any other way.
 *
 * The API needs a key, supplied as YOUTUBE_API_KEY. Without one the run fails
 * rather than carrying on: every other source would still scrape, the pages
 * would still be rewritten, and Annie's videos would quietly vanish from all of
 * them. A missing key is a broken refresh, not a smaller one.
 *
 * Titles are unusually well structured — "Takakkaw Peak, Yoho National Park,
 * BC - July 18th 2026" — carrying the objective, the area and the date, so they
 * give a region as well as a name.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import { splitObjectives } from '../canon.ts'
import { matchArea } from '../areas.ts'

const API = 'https://www.googleapis.com/youtube/v3'
const HANDLE = 'AnnieSteveClimbingTheRockies'
const PAGE_SIZE = 50

const MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec'

/**
 * The trailing date, in any of the forms the channel uses. A slash counts as a
 * lead-in because she also writes "Kananaskis Country/ AB /Jan 10th 2021", and
 * the spaces inside the date are optional because she also writes
 * "Jewell Pass loop Sunrise Jan23rd2021".
 */
const TRAILING_DATE = new RegExp(
  `[\\s,/-]+(?:${MONTHS})[a-z]*\\.?\\s*\\d{1,2}(?:st|nd|rd|th)?[,\\s]*\\d{4}.*$`, 'i')

/** Objective first, then area, separated by commas or a spaced dash. */
const PART_SEPARATOR = /\s+-\s+|,\s*/

/**
 * A video that is not a trip: channel trailers, season montages, tributes, and
 * the hockey camps that also live on the channel.
 */
const NOT_A_TRIP = /^(?:annieste|our hiking channel|welcome|intro|trailer|subscribe|hiking season|\d{4} hikes|junior a)|(?:montage|our angel|camp)$/i

/**
 * Activity and companion phrases appended to a name. Her earlier titles read
 * "Mount Temple scramble" or "HaLing Peak with my friends" where the later ones
 * read "Mount Temple, Banff, AB - <date>", so these are stripped from the end
 * until the name stops shrinking. Without it those videos become objectives of
 * their own instead of joining the peak every other source reported.
 *
 * "summit" is deliberately absent: "Baldy South Summit" and "Ship's Prow
 * Mountain true summit" are names, not activities.
 */
const TRAILING_QUALIFIER = new RegExp(
  '\\s+(?:'
  + 'mountain\\s+biking|cross\\s+country\\s+ski(?:ing)?'
  + '|sun(?:rise|set)|winter|spring|summer|autumn|solo|morning|evening|night'
  + '|snowshoe(?:ing)?|ski(?:ing)?|skat(?:e|ing)|bik(?:e|ing)|hik(?:e|ing)'
  + '|scrambl(?:e|ing)|backpacking|camping|trip|adventure|loop|traverse|attempt|trail'
  + '|via\\s+.+|with\\s+.+'
  + ')\\s*$', 'i')

/**
 * The area named in prose rather than in its own comma-separated field, as in
 * "Crypt lake hike in Waterton". Only stripped when what follows "in" is an
 * area we recognise, so a name like "Hole in the Wall" is left alone.
 */
const AREA_IN_PROSE = /^(.*?)\s+in\s+([^,]+)$/i

/**
 * Her own separator for a multi-summit day, written without the spaces the
 * shared splitter requires: "Door Jamb/ Loder peak/ Jura creek loop/". Split
 * here rather than in canon.ts so no other source starts splitting on a slash
 * that belongs inside a name.
 */
const HER_SEPARATOR = /\s*\/\s*/

/** A fragment left behind by a slash, as in "Ship's prow mountain hike/scramble". */
const PURE_QUALIFIER = /^(?:hik(?:e|ing)|scrambl(?:e|ing)|ski(?:ing)?|bik(?:e|ing)|snowshoe(?:ing)?|skat(?:e|ing)|loop|traverse|trail|trip|attempt|summit|adventure)$/i

/** Left-overs that are only a place name, from titles like "… / AB / <date>". */
const AREA_ONLY = /^(?:alberta|ab|bc|british columbia|canada|montana|usa|kananaskis(?: country)?|banff(?: national park)?|(?:canadian )?rockies)$/i

/** Strips trailing qualifiers repeatedly, never down to nothing. */
function stripQualifiers(name: string): string {
  let current = name.trim()
  for (;;) {
    const next = current.replace(TRAILING_QUALIFIER, '').trim()
    if (next === current || next.length === 0) return current
    current = next
  }
}

export interface ParsedTitle {
  readonly objectives: string[]
  readonly area?: string
}

/**
 * Splits a video title into the objectives it names and the area it happened
 * in. Exported so the parser can be tested against real titles without a key.
 */
export function parseTitle(title: string): ParsedTitle | undefined {
  // The date is stripped when present but not required: some trip videos carry
  // none, and dropping those loses real trips to catch a few non-trip posts
  // that the area match and curation catch anyway. It comes off before the
  // not-a-trip test so that a tribute or montage is still recognised by how its
  // wording ends rather than by the date trailing it.
  const withoutDate = title.replace(TRAILING_DATE, '').trim()
  if (!withoutDate || NOT_A_TRIP.test(withoutDate)) return undefined

  const parts = withoutDate.split(PART_SEPARATOR)
    .map(part => part.trim()).filter(Boolean)
  const [first, ...rest] = parts
  if (!first) return undefined

  // An area in its own field wins; failing that, look for one stated in prose.
  const inProse = AREA_IN_PROSE.exec(first)
  const proseArea = inProse ? matchArea(inProse[2]!) : undefined
  const name = proseArea && inProse?.[1] ? inProse[1] : first

  const objectives = name.split(HER_SEPARATOR)
    .flatMap(splitObjectives)
    .map(stripQualifiers)
    .filter(objective => objective.length > 1
      && !AREA_ONLY.test(objective)
      && !PURE_QUALIFIER.test(objective)
      // Re-tested after stripping: "Wenatchee Wild Junior A camp trip" only
      // ends in "camp" once the trailing "trip" has come off.
      && !NOT_A_TRIP.test(objective))
  if (objectives.length === 0) return undefined

  return { objectives, area: rest.map(matchArea).find(Boolean) ?? proseArea }
}

interface PlaylistPage {
  readonly items?: readonly { readonly snippet?: {
    readonly title?: string
    readonly resourceId?: { readonly videoId?: string }
  } }[]
  readonly nextPageToken?: string
  readonly error?: { readonly message?: string }
}

interface ChannelPage {
  readonly items?: readonly { readonly contentDetails?: {
    readonly relatedPlaylists?: { readonly uploads?: string }
  } }[]
  readonly error?: { readonly message?: string }
}

/** Every upload on the channel, oldest page first. */
async function readUploads(fetchText: Fetcher, key: string): Promise<{ title: string, videoId: string }[]> {
  const channel = JSON.parse(await fetchText(
    `${API}/channels?part=contentDetails&forHandle=${HANDLE}&key=${key}`)) as ChannelPage
  if (channel.error) throw new Error(`YouTube channels: ${channel.error.message ?? 'unknown error'}`)

  const uploads = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploads) throw new Error(`YouTube: no uploads playlist for @${HANDLE}`)

  const videos: { title: string, videoId: string }[] = []
  let pageToken = ''
  do {
    const page = JSON.parse(await fetchText(
      `${API}/playlistItems?part=snippet&playlistId=${uploads}`
      + `&maxResults=${PAGE_SIZE}&key=${key}${pageToken ? `&pageToken=${pageToken}` : ''}`)) as PlaylistPage
    if (page.error) throw new Error(`YouTube playlistItems: ${page.error.message ?? 'unknown error'}`)

    for (const item of page.items ?? []) {
      const title = item.snippet?.title?.trim()
      const videoId = item.snippet?.resourceId?.videoId
      if (title && videoId) videos.push({ title, videoId })
    }
    pageToken = page.nextPageToken ?? ''
  } while (pageToken)
  return videos
}

/**
 * The API key, or a failure explaining how to get one. Exported as the source's
 * preflight so the run stops before scraping anything rather than after five
 * minutes of reading the other six sites.
 */
export function requireApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) {
    throw new Error(
      'YOUTUBE_API_KEY is not set, so Annie Ouellet\'s channel cannot be read and the '
      + 'pages would be rewritten without her videos.\n'
      + '  Create a key at https://console.cloud.google.com/apis/credentials — a project, '
      + 'the YouTube Data API v3 enabled, an API key, no billing.\n'
      + '  Then: export YOUTUBE_API_KEY=... (one run costs about 7 of the 10,000 free '
      + 'daily quota units).'
    )
  }
  return key
}

export async function scrapeAnnie(fetchText: Fetcher): Promise<RawReport[]> {
  const key = requireApiKey()

  const reports: RawReport[] = []
  for (const { title, videoId } of await readUploads(fetchText, key)) {
    const parsed = parseTitle(title)
    if (!parsed || parsed.objectives.length === 0) continue
    reports.push({
      sourceId: 'annie',
      title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      objectives: parsed.objectives,
      sourceRegion: parsed.area
    })
  }
  return reports
}
