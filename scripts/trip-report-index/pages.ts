/**
 * The region pages as files: their names, the catch-all page the run replaces,
 * writing them and pruning what no region produced.
 *
 * The pages directory is a parameter so a test can point every function here at
 * a temporary tree.
 */
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { BuildResult } from './build.ts'
import { indent } from './output.ts'
import { REGIONS, UNSORTED } from './regions.ts'
import { entryNames, renderRegionPage } from './render.ts'

/** The index page is written by hand; the script owns every other page here. */
export const INDEX_PAGE = '01.index.md'

/**
 * Nuxt Content orders the sidebar by the filename, and it compares the numeric
 * prefix as a *string* — so `10.` sorts before `2.` and a folder past nine pages
 * lists itself in an order nobody chose. Zero-padding to two digits makes the
 * lexicographic order the numeric one. The prefix is stripped from the URL either
 * way, so padding changes the sidebar and nothing else.
 */
export function pageName(position: number, slug: string): string {
  return `${String(position).padStart(2, '0')}.${slug}.md`
}

export const UNSORTED_PAGE = pageName(REGIONS.length + 2, UNSORTED.id)

/** The names on the catch-all page as committed, or none on the first run. */
export async function previouslyUnsorted(pagesDir: string): Promise<Set<string>> {
  try {
    return entryNames(await readFile(join(pagesDir, UNSORTED_PAGE), 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Set()
    throw error
  }
}

/** Deletes every page in `pagesDir` but the index and `keep`, and returns their names. */
export async function pruneStalePages(pagesDir: string, keep: ReadonlySet<string>): Promise<string[]> {
  const existing = await readdir(pagesDir)
  const stale = existing.filter(name =>
    name.endsWith('.md') && name !== INDEX_PAGE && !keep.has(name))
  for (const name of stale) await unlink(join(pagesDir, name))
  return stale
}

/**
 * Writes one page per region, then the catch-all page last. The catch-all is
 * not a region: the weather and accommodation sections mirror REGIONS, and
 * asking them to carry a forecast for "unsorted" would make no sense.
 *
 * Returns the page names, written or (with `reviewOnly`) merely planned.
 */
export async function writeRegionPages(pagesDir: string, result: BuildResult, reviewOnly: boolean): Promise<string[]> {
  const pages = [
    ...REGIONS.map((region, index) => ({
      region,
      objectives: result.byRegion.get(region.id) ?? [],
      name: pageName(index + 2, region.id)
    })),
    { region: UNSORTED, objectives: result.unplaced, name: UNSORTED_PAGE }
  ]

  await mkdir(pagesDir, { recursive: true })
  for (const { region, objectives, name } of pages) {
    if (!reviewOnly) await writeFile(join(pagesDir, name), renderRegionPage(region, objectives), 'utf8')
    console.log(indent(`${String(objectives.length).padStart(5)}  ${name}`))
  }
  return pages.map(page => page.name)
}
