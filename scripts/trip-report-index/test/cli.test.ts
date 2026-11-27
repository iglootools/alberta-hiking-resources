import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { exitCodeFor, parseCommandLine } from '../cli.ts'
import { SourceChangedError, UsageError } from '../errors.ts'

describe('parseCommandLine', () => {
  it('runs for real by default', () => {
    assert.deepEqual(parseCommandLine([]), { kind: 'run', dryRun: false, refresh: false })
  })

  it('accepts --dry-run, -n and the older --review-only alike', () => {
    for (const flag of ['--dry-run', '-n', '--review-only']) {
      assert.deepEqual(parseCommandLine([flag]), { kind: 'run', dryRun: true, refresh: false })
    }
  })

  it('accepts --refresh alongside a dry run', () => {
    assert.deepEqual(parseCommandLine(['-n', '--refresh']), { kind: 'run', dryRun: true, refresh: true })
  })

  it('asks for help with --help or -h, whatever else is given', () => {
    assert.deepEqual(parseCommandLine(['--help']), { kind: 'help' })
    assert.deepEqual(parseCommandLine(['--refresh', '-h']), { kind: 'help' })
  })

  it('rejects an unknown option rather than running for real', () => {
    assert.throws(() => parseCommandLine(['--dryrun']), { name: 'UsageError' })
  })

  it('rejects a positional argument', () => {
    assert.throws(() => parseCommandLine(['banff']), { name: 'UsageError' })
  })
})

describe('exitCodeFor', () => {
  it('exits 2 for a usage error and 1 for a failed run', () => {
    assert.equal(exitCodeFor(new UsageError('Unknown option')), 2)
    assert.equal(exitCodeFor(new SourceChangedError('spirko', 'no index')), 1)
    assert.equal(exitCodeFor(new TypeError('fetch failed')), 1)
  })
})
