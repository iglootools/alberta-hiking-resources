/**
 * Cached HTTP for the scrape.
 *
 * Responses are cached on disk so that re-runs while iterating on the parsers
 * do not re-hit the volunteer-run blogs. The cache is keyed by URL and never
 * expires; `--refresh` clears it, which is what a real refresh run uses.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { HttpError, InvalidJsonError, RequestTimeoutError, redactKey } from './errors.ts'

/** Courtesy delay between live requests to the same host, in milliseconds. */
const THROTTLE_MS = 300

/**
 * How long one live request, body included, may take. undici's own limits are
 * five minutes for the headers and five for the body, so a host that accepts
 * the connection and stalls would otherwise hold the run silently for minutes
 * per URL. The largest response, a Natural Earth file of a few megabytes,
 * takes a second or two.
 */
const REQUEST_TIMEOUT_MS = 30_000

const USER_AGENT
  = 'alberta-hiking-resources trip-report indexer (+https://www.alberta-hiking-resources.org)'

/**
 * Fetches a URL's body, from the cache when it holds one.
 *
 * `accept` lets the caller reject a 2xx body before it is cached, by throwing:
 * an API error in the body or a maintenance page served as 200. Without it the
 * never-expiring cache would replay the bad body on every later run, and the
 * only way out would be `--refresh`, which drops every cached response. A
 * cached body `accept` rejects is evicted and the error rethrown, so the next
 * run asks again. `fetchJson` is the usual way to pass one.
 */
export interface Fetcher {
  (url: string, accept?: (body: string) => void): Promise<string>
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Cache file for a URL. An `key=` query parameter is redacted before hashing so
 * that the YouTube API's credential does not form part of the cache identity —
 * rotating a key should not invalidate every cached response.
 */
function cachePath(cacheDir: string, url: string): string {
  const identity = redactKey(url)
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
 * Caches `text` at `path`, all or nothing. Written beside it first and renamed
 * into place, because the cache never expires: a write cut short by Ctrl-C would
 * otherwise be served as the complete response on every later run, and a
 * truncated index page parses quietly into fewer reports.
 */
async function writeCached(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const partial = `${path}.${process.pid}.partial`
  await writeFile(partial, text, 'utf8')
  await rename(partial, path)
}

/**
 * Builds a fetcher over `cacheDir`. Decoding is explicit rather than left to
 * `Response.text()`: goldenscrambles.ca is windows-1252 and declares it only in
 * a meta tag, which `fetch` does not consult, so its accented names would
 * otherwise arrive mojibaked.
 *
 * `now` (the throttle's clock), `fetchImpl` and `timeoutMs` are parameters so a
 * test can drive the fetcher without the network or the wall clock.
 */
export function createFetcher(
  cacheDir: string,
  { now = Date.now, fetchImpl = fetch, timeoutMs = REQUEST_TIMEOUT_MS }:
  { now?: () => number, fetchImpl?: typeof fetch, timeoutMs?: number } = {}
): Fetcher {
  let lastRequest = 0

  return async function fetchText(url: string, accept: (body: string) => void = () => {}): Promise<string> {
    const path = cachePath(cacheDir, url)
    const cached = await readCached(path)
    if (cached !== undefined) {
      try {
        accept(cached)
      } catch (error) {
        await rm(path, { force: true })
        throw error
      }
      return cached
    }

    const wait = THROTTLE_MS - (now() - lastRequest)
    if (wait > 0) await sleep(wait)
    lastRequest = now()

    const text = await requestLive(fetchImpl, url, timeoutMs)
    accept(text)
    await writeCached(path, text)
    return text
  }
}

/**
 * Fetches `url` and parses it as JSON, caching the body only once it parses and
 * `check` accepts the value. `check` throws to reject it, as for an API error
 * reported in a 2xx body. A body that is not JSON fails as an InvalidJsonError
 * naming the URL, where `JSON.parse` alone would name none.
 */
export async function fetchJson<T>(fetchText: Fetcher, url: string, check: (value: T) => void = () => {}): Promise<T> {
  const parse = (body: string): T => {
    const value = parseJson<T>(url, body)
    check(value)
    return value
  }
  let accepted: { value: T } | undefined
  const body = await fetchText(url, (text) => {
    accepted = { value: parse(text) }
  })
  // A fetcher that ignores `accept`, such as a test's stub, still gets checked.
  return accepted ? accepted.value : parse(body)
}

function parseJson<T>(url: string, body: string): T {
  try {
    return JSON.parse(body) as T
  } catch (error) {
    throw new InvalidJsonError(url, (error as Error).message)
  }
}

/** The decoded body of a live request, failing with the URL on a non-2xx or a timeout. */
async function requestLive(fetchImpl: typeof fetch, url: string, timeoutMs: number): Promise<string> {
  const signal = AbortSignal.timeout(timeoutMs)
  try {
    const response = await fetchImpl(url, { headers: { 'user-agent': USER_AGENT }, signal })
    if (!response.ok) throw new HttpError(response.status, response.statusText, url)
    const buffer = Buffer.from(await response.arrayBuffer())
    return decode(buffer, response.headers.get('content-type') ?? '')
  } catch (error) {
    if (signal.aborted && (error as Error).name === 'TimeoutError') throw new RequestTimeoutError(url, timeoutMs)
    throw error
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
