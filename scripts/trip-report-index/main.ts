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
 *
 * Besides the pages, it draws the region map the section index pages show
 * (region-map.ts), since the map's shapes come from the same placements.
 *
 * This file is only the entry point: it reads the command line and the
 * repository's location, and reports a failure. The run itself is run.ts.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { repoPaths, runIndex } from './run.ts'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/**
 * Most failures here are a missing credential or a source that changed shape —
 * things to read, not to debug — so only the message is printed. `DEBUG=1`
 * restores the stack for an actual bug in the script.
 */
await runIndex(repoPaths(REPO), {
  refresh: process.argv.includes('--refresh'),
  reviewOnly: process.argv.includes('--review-only'),
  startedAt: new Date()
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\nFailed: ${message}\n`)
  if (process.env.DEBUG && error instanceof Error) console.error(error.stack)
  process.exit(1)
})
