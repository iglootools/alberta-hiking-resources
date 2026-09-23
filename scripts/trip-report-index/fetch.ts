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

/**
 * Builds a fetcher over `cacheDir`. Decoding is explicit rather than left to
 * `Response.text()`: goldenscrambles.ca is windows-1252 and declares it only in
 * a meta tag, which `fetch` does not consult, so its accented names would
 * otherwise arrive mojibaked.
 */
export function createFetcher(cacheDir: string): Fetcher {
  let lastRequest = 0

  return async function fetchText(url: string): Promise<string> {
    const path = cachePath(cacheDir, url)
    const cached = await readFile(path, 'utf8').catch(() => undefined)
    if (cached !== undefined) return cached

    const wait = THROTTLE_MS - (Date.now() - lastRequest)
    if (wait > 0) await sleep(wait)
    lastRequest = Date.now()

    const response = await fetch(url, { headers: { 'user-agent': USER_AGENT } })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`)

    const buffer = Buffer.from(await response.arrayBuffer())
    const text = decode(buffer, response.headers.get('content-type') ?? '')

    await mkdir(cacheDir, { recursive: true })
    await writeFile(path, text, 'utf8')
    return text
  }
}

function decode(buffer: Buffer, contentType: string): string {
  const declared = /charset=([\w-]+)/i.exec(contentType)?.[1]
    ?? /charset=["']?([\w-]+)/i.exec(buffer.subarray(0, 2048).toString('latin1'))?.[1]
  const charset = (declared ?? 'utf-8').toLowerCase()
  const label = charset === 'windows-1252' || charset === 'iso-8859-1' ? 'windows-1252' : 'utf-8'
  return new TextDecoder(label).decode(buffer)
}
