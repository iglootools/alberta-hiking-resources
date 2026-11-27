/**
 * Builds the by-objective trip report index.
 *
 *   mise run build-trip-index -- [--dry-run] [--refresh]
 *   mise run build-trip-index -- --help     for the options (cli.ts)
 *
 * It is never run by CI or at build time: the output is committed, so a blog
 * being down can delay a refresh but can never break a deploy.
 *
 * Besides the pages, it draws the region map the section index pages show
 * (region-map.ts), since the map's shapes come from the same placements.
 *
 * This file is only the entry point: it reads the command line, the
 * environment and the repository's location, and reports a failure. The
 * command line is parsed in cli.ts and the run itself is run.ts.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { USAGE, exitCodeFor, parseCommandLine } from './cli.ts'
import { repoPaths, runIndex } from './run.ts'
import { readCredentials } from './sources/index.ts'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

async function main(): Promise<void> {
  const command = parseCommandLine(process.argv.slice(2))
  if (command.kind === 'help') {
    console.log(USAGE)
    return
  }
  // Read before the run announces itself or touches the network, so a missing
  // credential fails in the first second.
  const credentials = readCredentials(process.env)
  await runIndex(repoPaths(REPO), {
    refresh: command.refresh,
    dryRun: command.dryRun,
    startedAt: new Date(),
    credentials
  })
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
  process.exit(exitCodeFor(error))
})
