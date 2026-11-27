/**
 * The site sections the index writes into or links to, each once: the URL
 * path its region pages are served under, and the folder under `content/`
 * they are written in.
 *
 * Nuxt Content serves a page at its folder path with the numeric prefixes
 * dropped, so the two must agree. Keeping both here means the links render.ts
 * writes, the index links checks.ts looks for and the folders run.ts reads
 * cannot drift apart one at a time.
 */
export interface Section {
  /** The URL path of the section's region pages, without a trailing slash. */
  readonly path: string
  /** The section's folder, as path segments under `content/`. */
  readonly dir: readonly string[]
}

/** The generated region pages. */
export const TRIP_REPORTS: Section = {
  path: '/hiking-scrambling-beta/trip-reports',
  dir: ['3.hiking-scrambling-beta', '3.trip-reports']
}

/** The hand-written weather pages, one per region. */
export const WEATHER: Section = {
  path: '/weather-trail-conditions/popular-locations',
  dir: ['4.weather-trail-conditions', '2.popular-locations']
}

/** The hand-written accommodation pages, one per region. */
export const ACCOMMODATION: Section = {
  path: '/accommodation',
  dir: ['5.accommodation']
}

/** The URL of one region's page in `section`. */
export function regionPath(section: Section, regionId: string): string {
  return `${section.path}/${regionId}`
}
