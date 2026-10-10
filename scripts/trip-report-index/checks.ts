/**
 * Consistency checks between the generated pages and the hand-written content
 * around them. Paths are parameters so the checks can run against any tree.
 */
import { readFile, readdir } from 'node:fs/promises'
import { basename } from 'node:path'
import { MissingMirroredPagesError, UnlinkedRegionsError } from './errors.ts'

/**
 * Fails when the hand-written index does not link a region, which is the one
 * way a generated page can go live with nothing pointing at it. A missing index
 * fails too, rather than skipping the check it exists for.
 */
export async function checkIndexLinks(indexPath: string, slugs: readonly string[]): Promise<void> {
  const index = await readFile(indexPath, 'utf8')
  const missing = slugs.filter(slug => !index.includes(`/hiking-scrambling-beta/trip-reports/${slug}`))
  if (missing.length > 0) throw new UnlinkedRegionsError(basename(indexPath), missing)
}

/**
 * Fails when a region has no weather or accommodation page. Those are hand-written
 * and cannot import this taxonomy, so this is what keeps the three sections from
 * drifting apart silently — the whole point of their sharing region ids.
 */
export async function checkMirroredSections(
  dirs: readonly string[],
  slugs: readonly string[]
): Promise<void> {
  for (const dir of dirs) {
    const present = new Set((await readdir(dir))
      .filter(name => name.endsWith('.md'))
      .map(name => name.replace(/^\d+\./, '').replace(/\.md$/, '')))
    const missing = slugs.filter(slug => !present.has(slug))
    if (missing.length > 0) throw new MissingMirroredPagesError(dir, missing)
  }
}
