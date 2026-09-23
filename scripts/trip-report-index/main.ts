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
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildObjectives } from './build.ts'
import { clearCache, createFetcher } from './fetch.ts'
import { readGuidebooks } from './guidebooks.ts'
import { REGIONS, UNSORTED } from './regions.ts'
import { SOURCES } from './sources/index.ts'
import { renderRegionPage } from './render.ts'
import { writeReview } from './review.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..', '..')
const PAGES_DIR = join(REPO, 'content', '3.hiking-scrambling-beta', '3.trip-reports')

const CACHE_DIR = join(REPO, 'node_modules', '.cache', 'trip-report-index')
const REVIEW_PATH = join(REPO, 'trip-report-review.md')

/** `1.index.md` is written by hand; the script owns every other page here. */
const INDEX_PAGE = '1.index.md'

async function scrapeAll(refresh: boolean) {
  if (refresh) await clearCache(CACHE_DIR)
  const fetchText = createFetcher(CACHE_DIR)

  const reports = []
  for (const source of SOURCES) {
    const scraped = await source.scrape(fetchText)
    if (scraped.length < source.minimumReports) {
      throw new Error(
        `${source.id}: found ${scraped.length} reports, expected at least `
        + `${source.minimumReports}. The site has probably changed shape — fix the `
        + `adapter rather than lowering the minimum.`
      )
    }
    console.log(`  ${source.label.padEnd(18)} ${String(scraped.length).padStart(5)} reports`)
    reports.push(...scraped)
  }
  return reports
}

/** Removes region pages for regions that no longer exist. */
async function pruneStalePages(keep: ReadonlySet<string>): Promise<string[]> {
  const existing = await readdir(PAGES_DIR).catch(() => [])
  const stale = existing.filter(name =>
    name.endsWith('.md') && name !== INDEX_PAGE && !keep.has(name))
  for (const name of stale) await unlink(join(PAGES_DIR, name))
  return stale
}

/**
 * Fails when the hand-written index does not link a region, which is the one
 * way a generated page can go live with nothing pointing at it.
 */
async function checkIndexLinks(slugs: readonly string[]): Promise<void> {
  const index = await readFile(join(PAGES_DIR, INDEX_PAGE), 'utf8').catch(() => '')
  if (!index) return
  const missing = slugs.filter(slug => !index.includes(`/hiking-scrambling-beta/trip-reports/${slug}`))
  if (missing.length > 0) {
    throw new Error(`${INDEX_PAGE} does not link: ${missing.join(', ')}. Add a card for each.`)
  }
}

async function main(): Promise<void> {
  const refresh = process.argv.includes('--refresh')
  const reviewOnly = process.argv.includes('--review-only')

  // Fail before announcing or touching the network if a credential is missing.
  for (const source of SOURCES) source.preflight?.()

  console.log(`Scraping ${SOURCES.length} sources${refresh ? ' (cache cleared)' : ''}…`)
  const reports = await scrapeAll(refresh)

  const guidebooks = await readGuidebooks(createFetcher(CACHE_DIR))
  console.log(`  ${'Guidebook lists'.padEnd(18)} ${String(guidebooks.entries.size).padStart(5)} objectives`)

  const result = buildObjectives(reports, guidebooks)

  const written: string[] = []
  const slugs: string[] = []
  await mkdir(PAGES_DIR, { recursive: true })

  for (const [index, region] of REGIONS.entries()) {
    const objectives = result.byRegion.get(region.id) ?? []
    const slug = region.id
    const name = `${index + 2}.${slug}.md`
    slugs.push(slug)
    if (!reviewOnly) await writeFile(join(PAGES_DIR, name), renderRegionPage(region, objectives), 'utf8')
    written.push(name)
    console.log(`  ${String(objectives.length).padStart(5)}  ${name}`)
  }

  // The catch-all page goes last. It is not a region: the weather and
  // accommodation sections mirror REGIONS, and asking them to carry a forecast
  // for "unsorted" would make no sense.
  const unsortedName = `${REGIONS.length + 2}.${UNSORTED.id}.md`
  if (!reviewOnly) {
    await writeFile(join(PAGES_DIR, unsortedName), renderRegionPage(UNSORTED, result.unplaced), 'utf8')
  }
  written.push(unsortedName)
  console.log(`  ${String(result.unplaced.length).padStart(5)}  ${unsortedName}`)

  if (!reviewOnly) {
    const stale = await pruneStalePages(new Set(written))
    for (const name of stale) console.log(`  removed stale page ${name}`)
    await checkIndexLinks([...slugs, UNSORTED.id])
  }

  await writeFile(REVIEW_PATH, writeReview(result), 'utf8')
  const total = [...result.byRegion.values()].reduce((sum, list) => sum + list.length, 0)
  console.log(`\n${total} objectives across ${REGIONS.length} pages, `
    + `${reports.length} reports, ${result.outOfScopeCount} out of scope.`)
  console.log(`${result.unplaced.length} unplaced and ${result.conflicts.length} conflicted — see ${REVIEW_PATH}`)
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
