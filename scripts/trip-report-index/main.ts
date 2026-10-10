/**
 * Builds the by-objective trip report index.
 *
 *   node scripts/trip-report-index/main.ts [--refresh] [--review-only]
 *
 * Normally run through `mise run build-trip-index`. It is never run by CI or at
 * build time: the output is committed, so a blog being down can delay a refresh
 * but can never break a deploy.
 *
 *   --refresh      discard the HTTP cache and re-read every source
 *   --review-only  report what would change without writing any page
 */
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BuildResult } from './build.ts'
import { buildObjectives } from './build.ts'
import { checkIndexLinks, checkMirroredSections } from './checks.ts'
import { MinimumNotMetError } from './errors.ts'
import { clearCache, createFetcher } from './fetch.ts'
import { readGuidebooks } from './guidebooks.ts'
import { indent, shown } from './output.ts'
import { REGIONS, UNSORTED } from './regions.ts'
import { SOURCES } from './sources/index.ts'
import { renderRegionPage } from './render.ts'
import { writeReview } from './review.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..', '..')
const PAGES_DIR = join(REPO, 'content', '3.hiking-scrambling-beta', '3.trip-reports')

/**
 * The weather and accommodation sections are written by hand but use this same
 * region taxonomy, so a region added here needs a page in each of them too.
 */
const MIRRORED_SECTIONS = [
  join(REPO, 'content', '4.weather-trail-conditions', '2.popular-locations'),
  join(REPO, 'content', '5.accommodation')
]
const CACHE_DIR = join(REPO, 'node_modules', '.cache', 'trip-report-index')
const REVIEW_PATH = join(REPO, 'trip-report-review.md')

/** `1.index.md` is written by hand; the script owns every other page here. */
const INDEX_PAGE = '01.index.md'

async function scrapeAll(refresh: boolean) {
  if (refresh) await clearCache(CACHE_DIR)
  const fetchText = createFetcher(CACHE_DIR)

  const reports = []
  for (const source of SOURCES) {
    const scraped = await source.scrape(fetchText)
    if (scraped.length < source.minimumReports) {
      throw new MinimumNotMetError(source.id, scraped.length, source.minimumReports, 'reports')
    }
    console.log(indent(`${source.label.padEnd(18)} ${String(scraped.length).padStart(5)} reports`))
    reports.push(...scraped)
  }
  return reports
}

/**
 * Nuxt Content orders the sidebar by the filename, and it compares the numeric
 * prefix as a *string* — so `10.` sorts before `2.` and a folder past nine pages
 * lists itself in an order nobody chose. Zero-padding to two digits makes the
 * lexicographic order the numeric one. The prefix is stripped from the URL either
 * way, so padding changes the sidebar and nothing else.
 */
function pageName(position: number, slug: string): string {
  return `${String(position).padStart(2, '0')}.${slug}.md`
}

/** Removes region pages for regions that no longer exist. */
async function pruneStalePages(keep: ReadonlySet<string>): Promise<string[]> {
  const existing = await readdir(PAGES_DIR)
  const stale = existing.filter(name =>
    name.endsWith('.md') && name !== INDEX_PAGE && !keep.has(name))
  for (const name of stale) await unlink(join(PAGES_DIR, name))
  return stale
}

/**
 * Writes one page per region, then the catch-all page last. The catch-all is
 * not a region: the weather and accommodation sections mirror REGIONS, and
 * asking them to carry a forecast for "unsorted" would make no sense.
 *
 * Returns the page names, written or (with `reviewOnly`) merely planned.
 */
async function writeRegionPages(result: BuildResult, reviewOnly: boolean): Promise<string[]> {
  const pages = [
    ...REGIONS.map((region, index) => ({
      region,
      objectives: result.byRegion.get(region.id) ?? [],
      name: pageName(index + 2, region.id)
    })),
    { region: UNSORTED, objectives: result.unplaced, name: pageName(REGIONS.length + 2, UNSORTED.id) }
  ]

  await mkdir(PAGES_DIR, { recursive: true })
  for (const { region, objectives, name } of pages) {
    if (!reviewOnly) await writeFile(join(PAGES_DIR, name), renderRegionPage(region, objectives), 'utf8')
    console.log(indent(`${String(objectives.length).padStart(5)}  ${name}`))
  }
  return pages.map(page => page.name)
}

/** Prunes what no region produced, then runs the cross-section consistency checks. */
async function finishPages(written: readonly string[]): Promise<void> {
  const stale = await pruneStalePages(new Set(written))
  for (const name of stale) console.log(indent(`removed stale page ${name}`))
  const slugs = REGIONS.map(region => region.id)
  await checkIndexLinks(join(PAGES_DIR, INDEX_PAGE), [...slugs, UNSORTED.id])
  await checkMirroredSections(MIRRORED_SECTIONS, slugs)
}

function printSummary(result: BuildResult, reportCount: number): void {
  const total = [...result.byRegion.values()].reduce((sum, list) => sum + list.length, 0)
  console.log(`\n${total} objectives across ${REGIONS.length} pages, `
    + `${reportCount} reports, ${result.outOfScopeCount} out of scope.`)
  console.log(`${result.unplaced.length} unplaced and ${result.conflicts.length} conflicted — `
    + `see ${shown(REVIEW_PATH)}`)
}

async function main(): Promise<void> {
  const refresh = process.argv.includes('--refresh')
  const reviewOnly = process.argv.includes('--review-only')

  // Fail before announcing or touching the network if a credential is missing.
  for (const source of SOURCES) source.preflight?.()

  console.log(`Scraping ${SOURCES.length} sources${refresh ? ' (cache cleared)' : ''}…`)
  const reports = await scrapeAll(refresh)

  const guidebooks = await readGuidebooks(createFetcher(CACHE_DIR))
  console.log(indent(`${'Guidebook lists'.padEnd(18)} ${String(guidebooks.entries.size).padStart(5)} objectives`))

  const result = buildObjectives(reports, guidebooks)
  const written = await writeRegionPages(result, reviewOnly)
  if (!reviewOnly) await finishPages(written)

  await writeFile(REVIEW_PATH, writeReview(result, new Date()), 'utf8')
  printSummary(result, reports.length)
}

/**
 * Most failures here are a missing credential or a source that changed shape —
 * things to read, not to debug — so only the message is printed. `DEBUG=1`
 * restores the stack for an actual bug in the script.
 */
await main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\nFailed: ${message}\n`)
  if (process.env.DEBUG && error instanceof Error) console.error(error.stack)
  process.exit(1)
})
