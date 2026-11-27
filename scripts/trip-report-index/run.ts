/**
 * One run of the trip report index: scrape every source, place the objectives,
 * write the region pages and the region map, and write the review worksheet.
 *
 * Every path the run reads or writes is in `IndexPaths`, and every choice the
 * command line makes is in `RunOptions`, so a test can run any part of it
 * against a temporary tree. main.ts is the entry point that fills both in.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Gazetteer } from './gazetteer.ts'
import type { BuildResult, Objective } from './types.ts'
import { buildObjectives } from './build.ts'
import { checkIndexLinks, checkMirroredSections } from './checks.ts'
import { MinimumNotMetError } from './errors.ts'
import { clearCache, createFetcher } from './fetch.ts'
import { readGazetteer } from './gazetteer.ts'
import { readGuidebooks } from './guidebooks.ts'
import { inferRegions } from './inference.ts'
import { indent, shown } from './output.ts'
import { readBasemap } from './basemap.ts'
import { GENERATED_PAGES, INDEX_PAGE, findStalePages, previouslyUnsorted, pruneStalePages, writeRegionPages } from './pages.ts'
import { MAP_EXTENT, cellCount, dropIsolated, geoFeatures, mapPoints, projection, rasterize, svgRegion } from './region-map.ts'
import { REGIONS, UNSORTED } from './regions.ts'
import { ACCOMMODATION, TRIP_REPORTS, WEATHER } from './sections.ts'
import { isInferredOnly, isMultiRegion } from './types.ts'
import type { Credentials } from './sources/index.ts'
import { SOURCES } from './sources/index.ts'
import { entryName } from './render.ts'
import { renderReview } from './review.ts'

/** Where a run reads and writes. */
export interface IndexPaths {
  /** The generated region pages, beside the hand-written index page. */
  readonly pagesDir: string
  /**
   * The weather and accommodation sections are written by hand but use this same
   * region taxonomy, so a region added here needs a page in each of them too.
   */
  readonly mirroredSections: readonly string[]
  readonly cacheDir: string
  readonly reviewPath: string
  /**
   * The SVG map's data is imported by its component, so it is bundled and
   * prerendered with the page. The GeoJSON is only fetched by the MapLibre
   * renderer, once a reader picks it, so it is a static file instead.
   */
  readonly mapSvgPath: string
  readonly mapGeojsonPath: string
}

/** The paths of a real run, inside the repository at `repo`. */
export function repoPaths(repo: string): IndexPaths {
  return {
    pagesDir: join(repo, 'content', ...TRIP_REPORTS.dir),
    mirroredSections: [WEATHER, ACCOMMODATION].map(section => join(repo, 'content', ...section.dir)),
    cacheDir: join(repo, 'node_modules', '.cache', 'trip-report-index'),
    reviewPath: join(repo, 'trip-report-review.md'),
    mapSvgPath: join(repo, 'app', 'assets', 'region-map.json'),
    mapGeojsonPath: join(repo, 'public', 'region-map', 'regions.geojson')
  }
}

export interface RunOptions {
  /** Discard the HTTP cache and re-read every source. */
  readonly refresh: boolean
  /** Report what would change, labelled `[dry-run]`, writing only the review worksheet. */
  readonly dryRun: boolean
  /** When the run started, as dated in the review worksheet. */
  readonly startedAt: Date
  /** Read by the entry point before the run, so a missing one stops it before any request. */
  readonly credentials: Credentials
}

/** A region drawn in fewer cells than this is hard to find or click on the map, and is reported. */
const SMALL_REGION_CELLS = 20

async function scrapeAll(cacheDir: string, refresh: boolean, credentials: Credentials) {
  if (refresh) await clearCache(cacheDir)
  const fetchText = createFetcher(cacheDir)

  const reports = []
  for (const source of SOURCES) {
    const scraped = await source.scrape(fetchText, credentials)
    if (scraped.length < source.minimumReports) {
      throw new MinimumNotMetError(source.id, scraped.length, source.minimumReports, 'reports')
    }
    console.log(indent(`${source.label.padEnd(18)} ${String(scraped.length).padStart(5)} reports`))
    reports.push(...scraped)
  }
  return reports
}

/**
 * Fails when the hand-written content around the pages has drifted from the
 * regions: the index lacks a card, or the weather or accommodation section
 * lacks a page. They read only REGIONS and hand-written files, so they run
 * before anything is written.
 */
async function checkConsistency(paths: IndexPaths): Promise<void> {
  const slugs = REGIONS.map(region => region.id)
  await checkIndexLinks(join(paths.pagesDir, INDEX_PAGE), [...slugs, UNSORTED.id])
  await checkMirroredSections(paths.mirroredSections, slugs)
}

/** Both renderers' data, and the regions drawn too small to click easily, for the summary. */
export interface RegionMap {
  readonly svg: object
  readonly geojson: object
  readonly smallRegions: readonly string[]
}

/** Draws the region map from the placements over the Natural Earth basemap, which it fetches. */
async function drawRegionMap(cacheDir: string, result: BuildResult, gazetteer: Gazetteer): Promise<RegionMap> {
  const regionIds = REGIONS.map(region => region.id)
  const grid = rasterize(dropIsolated(mapPoints(result.objectives, gazetteer)), regionIds)
  const smallRegions = REGIONS.filter((_, index) => cellCount(grid, index) < SMALL_REGION_CELLS).map(region => region.id)

  const project = projection()
  const basemap = await readBasemap(createFetcher(cacheDir), MAP_EXTENT, project)
  const svg = {
    width: project.width,
    height: project.height,
    regions: REGIONS.map((region, index) => ({ ...svgRegion(grid, index, region.id, region.title, project), group: region.group })),
    ...basemap
  }
  const geojson = {
    type: 'FeatureCollection',
    features: REGIONS.flatMap((region, index) => geoFeatures(grid, index, region.id, region.title))
  }
  return { svg, geojson, smallRegions }
}

async function writeRegionMap(paths: IndexPaths, map: RegionMap): Promise<void> {
  await mkdir(dirname(paths.mapGeojsonPath), { recursive: true })
  await writeFile(paths.mapSvgPath, `${JSON.stringify(map.svg)}\n`, 'utf8')
  await writeFile(paths.mapGeojsonPath, `${JSON.stringify(map.geojson)}\n`, 'utf8')
  console.log(indent(`region map  ${shown(paths.mapSvgPath)}, ${shown(paths.mapGeojsonPath)}`))
}

function printSummary(
  reviewPath: string,
  result: BuildResult,
  reportCount: number,
  newlyUnsorted: readonly Objective[],
  smallOnMap: readonly string[],
  dryRun: boolean
): void {
  const listings = [...result.byRegion.values()].reduce((sum, list) => sum + list.length, 0)
  const placed = result.objectives.length - result.unplaced.length
  const multiRegion = result.objectives.filter(isMultiRegion).length
  const inferredOnly = result.objectives.filter(isInferredOnly).length
  console.log(`\n${dryRun ? '[dry-run] ' : ''}${placed} objectives placed, ${listings} listings across ${REGIONS.length} pages, `
    + `${reportCount} reports, ${result.dropped.length} out of scope.`)
  console.log(`${multiRegion} in more than one region, ${inferredOnly} placed by inference alone, `
    + `${result.unplaced.length} unplaced — see ${shown(reviewPath)}`)
  if (newlyUnsorted.length > 0) {
    console.log(`\n${newlyUnsorted.length} new on the catch-all page:`)
    for (const objective of newlyUnsorted) console.log(indent(objective.name))
  }
  if (smallOnMap.length > 0) {
    console.log(`\nDrawn in fewer than ${SMALL_REGION_CELLS} cells on the region map, mostly because their `
      + 'objectives are shared with a neighbour:')
    for (const regionId of smallOnMap) console.log(indent(regionId))
  }
}

/** What the sources yield once placed and drawn: everything the run writes, not yet written. */
export interface IndexBuild {
  readonly reportCount: number
  readonly result: BuildResult
  readonly map: RegionMap
}

/** Reads every source and reference list, places the objectives and draws the map. Writes nothing. */
async function readIndex(cacheDir: string, { refresh, credentials }: RunOptions): Promise<IndexBuild> {
  console.log(`Scraping ${SOURCES.length} sources${refresh ? ' (cache cleared)' : ''}…`)
  const reports = await scrapeAll(cacheDir, refresh, credentials)

  const guidebooks = await readGuidebooks(createFetcher(cacheDir))
  console.log(indent(`${'Guidebook lists'.padEnd(18)} ${String(guidebooks.entries.size).padStart(5)} objectives`))
  const gazetteer = await readGazetteer(createFetcher(cacheDir))
  console.log(indent(`${'Place names'.padEnd(18)} ${String(gazetteer.size).padStart(5)} names`))

  // Twice: inference reads where the first build placed things, and the second
  // lists every objective under every region a stated or inferred signal names.
  const statedOnly = buildObjectives(reports, guidebooks)
  const result = buildObjectives(reports, guidebooks, inferRegions(statedOnly, gazetteer))
  return { reportCount: reports.length, result, map: await drawRegionMap(cacheDir, result, gazetteer) }
}

/**
 * Writes the region pages, prunes the stale ones and writes the map, or with
 * `dryRun` only names the pages; then writes the review worksheet and
 * prints the summary.
 *
 * Fails with UnknownPagesError before writing anything when the pages folder
 * holds a page the indexer did not generate, so a failure leaves the committed
 * output whole rather than half rewritten.
 */
export async function writeIndex(
  paths: IndexPaths,
  { reportCount, result, map }: IndexBuild,
  { dryRun, startedAt }: Pick<RunOptions, 'dryRun' | 'startedAt'>
): Promise<void> {
  const keep = new Set(GENERATED_PAGES)
  const stale = await findStalePages(paths.pagesDir, keep)
  // Read before the pages are rewritten: this is the page the run replaces.
  const before = await previouslyUnsorted(paths.pagesDir)
  const newlyUnsorted = result.unplaced.filter(objective => !before.has(entryName(objective)))

  await writeRegionPages(paths.pagesDir, result, dryRun)
  if (dryRun) {
    for (const name of stale) console.log(indent(`[dry-run] Would remove stale page ${name}`))
    console.log(indent(`[dry-run] Would write the region map to ${shown(paths.mapSvgPath)}, ${shown(paths.mapGeojsonPath)}`))
  } else {
    for (const name of await pruneStalePages(paths.pagesDir, keep)) console.log(indent(`removed stale page ${name}`))
    await writeRegionMap(paths, map)
  }

  await writeFile(paths.reviewPath, renderReview(result, startedAt, { newlyUnsorted }), 'utf8')
  printSummary(paths.reviewPath, result, reportCount, newlyUnsorted, map.smallRegions, dryRun)
}

/**
 * Runs the index once, printing its progress and summary.
 *
 * Everything that can fail runs before the first write, in dry-run mode
 * too: the consistency checks before the scrape, since they read only REGIONS
 * and hand-written files, and the basemap fetch with the scrape. A failure
 * therefore leaves the committed output whole, and dry-run mode shows the
 * failure a real run would hit.
 *
 * Throws the typed errors in errors.ts for a source that changed shape or a
 * failed consistency check; main.ts reports them.
 */
export async function runIndex(paths: IndexPaths, options: RunOptions): Promise<void> {
  await checkConsistency(paths)
  await writeIndex(paths, await readIndex(paths.cacheDir, options), options)
}
