/**
 * Cached HTTP for the scrape.
 *
 * Responses are cached on disk so that re-runs while iterating on the parsers
 * do not re-hit six volunteer-run blogs. The cache is keyed by URL and never
 * expires; `--refresh` clears it, which is what a real refresh run uses.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { HttpError } from './errors.ts'

/** Courtesy delay between live requests to the same host, in milliseconds. */
const THROTTLE_MS = 300

const USER_AGENT
  = 'alberta-hiking-resources trip-report indexer (+https://www.alberta-hiking-resources.org)'

export interface Fetcher {
  (url: string): Promise<string>
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Cache file for a URL. An `key=` query parameter is redacted before hashing so
 * that the YouTube API's credential does not form part of the cache identity —
 * rotating a key should not invalidate every cached response.
 */
function cachePath(cacheDir: string, url: string): string {
  const identity = url.replace(/([?&]key=)[^&]*/i, '$1REDACTED')
  return join(cacheDir, `${createHash('sha256').update(identity).digest('hex').slice(0, 32)}.html`)
}

export async function clearCache(cacheDir: string): Promise<void> {
  await rm(cacheDir, { recursive: true, force: true })
}

/** The cached body, or undefined on a miss. An unreadable cache is an error, not a miss. */
async function readCached(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

/**
 * Builds a fetcher over `cacheDir`. Decoding is explicit rather than left to
 * `Response.text()`: goldenscrambles.ca is windows-1252 and declares it only in
 * a meta tag, which `fetch` does not consult, so its accented names would
 * otherwise arrive mojibaked.
 *
 * `now` (the throttle's clock) and `fetchImpl` are parameters so a test can
 * drive the fetcher without the network or the wall clock.
 */
export function createFetcher(
  cacheDir: string,
  { now = Date.now, fetchImpl = fetch }: { now?: () => number, fetchImpl?: typeof fetch } = {}
): Fetcher {
  let lastRequest = 0

  return async function fetchText(url: string): Promise<string> {
    const path = cachePath(cacheDir, url)
    const cached = await readCached(path)
    if (cached !== undefined) return cached

    const wait = THROTTLE_MS - (now() - lastRequest)
    if (wait > 0) await sleep(wait)
    lastRequest = now()

    const response = await fetchImpl(url, { headers: { 'user-agent': USER_AGENT } })
    if (!response.ok) throw new HttpError(response.status, response.statusText, url)

    const buffer = Buffer.from(await response.arrayBuffer())
    const text = decode(buffer, response.headers.get('content-type') ?? '')

    await mkdir(cacheDir, { recursive: true })
    await writeFile(path, text, 'utf8')
    return text
  }
}

/**
 * Fetches `url`, answering undefined for one expected HTTP status and throwing
 * for anything else. Narrower than a blanket catch on purpose: a dead link is a
 * fact about the source, but a 500 or a dropped connection is a broken run, and
 * swallowing it would quietly index less than the source publishes.
 */
export async function fetchUnlessStatus(
  fetchText: Fetcher,
  url: string,
  status: number
): Promise<string | undefined> {
  try {
    return await fetchText(url)
  } catch (error) {
    if (error instanceof HttpError && error.status === status) return undefined
    throw error
  }
}

function decode(buffer: Buffer, contentType: string): string {
  const declared = /charset=([\w-]+)/i.exec(contentType)?.[1]
    ?? /charset=["']?([\w-]+)/i.exec(buffer.subarray(0, 2048).toString('latin1'))?.[1]
  const charset = (declared ?? 'utf-8').toLowerCase()
  const label = charset === 'windows-1252' || charset === 'iso-8859-1' ? 'windows-1252' : 'utf-8'
  return new TextDecoder(label).decode(buffer)
}
