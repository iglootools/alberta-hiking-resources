/**
 * The failures the run reports, as data.
 *
 * Callers branch on these fields rather than on message text — a pagination
 * loop ends on `HttpError.status === 400`, not on a message that happens to
 * contain "400" — and a test can assert on them the same way.
 */
import { indent, shown } from './output.ts'

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

/** A credential the run needs is not in the environment. */
export class MissingCredentialError extends Error {
  readonly variable: string

  constructor(variable: string, message: string) {
    super(message)
    this.name = 'MissingCredentialError'
    this.variable = variable
  }
}

/** An API answered 2xx, but with an error in the body — YouTube and WordPress.com both do this. */
export class ApiError extends Error {
  readonly api: string
  readonly detail: string

  constructor(api: string, detail: string) {
    super(`${api}: ${detail}`)
    this.name = 'ApiError'
    this.api = api
    this.detail = detail
  }
}

/**
 * A source answered, but not in the shape its adapter was written against: a
 * category gone, a playlist missing, a list that is not a list. Like a missed
 * minimum, the fix is the adapter.
 */
export class SourceChangedError extends Error {
  readonly source: string
  readonly detail: string

  constructor(source: string, detail: string) {
    super(`${source}: ${detail}`)
    this.name = 'SourceChangedError'
    this.source = source
    this.detail = detail
  }
}

/** Resolution produced a region id the taxonomy does not have. */
export class UnknownRegionError extends Error {
  readonly objective: string
  readonly regionId: string

  constructor(objective: string, regionId: string) {
    super(`Objective "${objective}" resolved to unknown region "${regionId}"`)
    this.name = 'UnknownRegionError'
    this.objective = objective
    this.regionId = regionId
  }
}

/** The hand-written trip reports index has no card for some generated region pages. */
export class UnlinkedRegionsError extends Error {
  readonly page: string
  readonly missing: readonly string[]

  constructor(page: string, missing: readonly string[]) {
    super(`${page} does not link: ${missing.join(', ')}. Add a card for each.`)
    this.name = 'UnlinkedRegionsError'
    this.page = page
    this.missing = missing
  }
}

/** A weather or accommodation section has no page for some regions. */
export class MissingMirroredPagesError extends Error {
  readonly dir: string
  readonly missing: readonly string[]

  constructor(dir: string, missing: readonly string[]) {
    super(
      `${shown(dir)} has no page for: ${missing.join(', ')}.\n`
      + indent('Weather and accommodation use the same regions as the trip reports; add a page '
        + 'for each, or remove the region from regions.ts.')
    )
    this.name = 'MissingMirroredPagesError'
    this.dir = dir
    this.missing = missing
  }
}
