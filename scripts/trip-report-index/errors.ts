/**
 * The failures the run reports, as data.
 *
 * Callers branch on these fields rather than on message text — a pagination
 * loop ends on `HttpError.status === 400`, not on a message that happens to
 * contain "400" — and a test can assert on them the same way.
 */

/** A response that came back, but not with a 2xx. Network failures are not this. */
export class HttpError extends Error {
  readonly status: number
  readonly url: string

  constructor(status: number, statusText: string, url: string) {
    super(`${status} ${statusText} for ${url}`)
    this.name = 'HttpError'
    this.status = status
    this.url = url
  }
}

/**
 * A source or list yielded fewer items than its guard allows: the site has
 * almost certainly changed shape, and the fix is the parser, never the minimum.
 */
export class MinimumNotMetError extends Error {
  readonly subject: string
  readonly found: number
  readonly minimum: number

  constructor(subject: string, found: number, minimum: number, unit: string) {
    super(
      `${subject}: found ${found} ${unit}, expected at least ${minimum}. The site has `
      + 'probably changed shape — fix the parser rather than lowering the minimum.'
    )
    this.name = 'MinimumNotMetError'
    this.subject = subject
    this.found = found
    this.minimum = minimum
  }
}

/**
 * A paginated read reached its page cap without the API saying it had finished.
 * Stopping there would index part of the archive and look complete.
 */
export class PageLimitError extends Error {
  readonly url: string
  readonly limit: number

  constructor(url: string, limit: number) {
    super(`Still paginating after ${limit} pages at ${url}. Raise the cap; the archive has outgrown it.`)
    this.name = 'PageLimitError'
    this.url = url
    this.limit = limit
  }
}
