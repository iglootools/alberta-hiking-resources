/**
 * The indexer's command line: its usage, its arguments, and the exit code for
 * a failure. Decisions only, over plain values; main.ts acts on them.
 */
import { parseArgs } from 'node:util'
import { UsageError } from './errors.ts'

export const USAGE = `Usage: mise run build-trip-index -- [options]

Rebuilds the by-objective trip report index: the region pages under
content/3.hiking-scrambling-beta/3.trip-reports/, the region map, and the
review worksheet trip-report-review.md.

Options:
  -n, --dry-run    show what would change, writing only the review worksheet
                   (--review-only is an alias)
      --refresh    discard the HTTP cache and re-read every source
  -h, --help       show this help`

/** What the command line asks for. */
export type Command
  = | { readonly kind: 'help' }
    | { readonly kind: 'run', readonly dryRun: boolean, readonly refresh: boolean }

/**
 * The command `args` (the arguments after the script) ask for. Throws
 * UsageError on an unknown option or any positional argument: ignoring one
 * would turn a typo such as `--dryrun` into a full run that rewrites every page.
 */
export function parseCommandLine(args: readonly string[]): Command {
  let values
  try {
    ({ values } = parseArgs({
      args: [...args],
      options: {
        'dry-run': { type: 'boolean', short: 'n' },
        'review-only': { type: 'boolean' },
        'refresh': { type: 'boolean' },
        'help': { type: 'boolean', short: 'h' }
      },
      strict: true,
      allowPositionals: false
    }))
  } catch (error) {
    if (String((error as NodeJS.ErrnoException).code).startsWith('ERR_PARSE_ARGS')) {
      throw new UsageError((error as Error).message)
    }
    throw error
  }
  if (values.help) return { kind: 'help' }
  return { kind: 'run', dryRun: Boolean(values['dry-run'] || values['review-only']), refresh: Boolean(values.refresh) }
}

/** 2 for a usage error, which the input must fix; 1 for a run that failed. */
export function exitCodeFor(error: unknown): 1 | 2 {
  return error instanceof UsageError ? 2 : 1
}
