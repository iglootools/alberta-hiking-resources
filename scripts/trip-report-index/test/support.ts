/**
 * Test doubles. Every collaborator a test needs to replace is already a
 * parameter, so these are plain values passed in — nothing is patched.
 */
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Fetcher } from '../fetch.ts'
import { HttpError } from '../errors.ts'

/**
 * A fetcher answering from `respond`: a string is the body, a number is the
 * HTTP status of a failed response. Recorded URLs let a test assert on what
 * was asked for.
 */
export function stubFetcher(respond: (url: string) => string | number): Fetcher & { urls: string[] } {
  const urls: string[] = []
  const fetcher = async (url: string): Promise<string> => {
    urls.push(url)
    const answer = respond(url)
    if (typeof answer === 'number') throw new HttpError(answer, 'Stubbed', url)
    return answer
  }
  return Object.assign(fetcher, { urls })
}

/** A JSON array of `count` empty objects, the shape of a WordPress page. */
export function jsonItems(count: number): string {
  return JSON.stringify(Array.from({ length: count }, () => ({})))
}

export async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'trip-report-index-'))
}
