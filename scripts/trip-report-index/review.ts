/**
 * The curation worksheet.
 *
 * Everything the run could not decide by itself ends up here rather than in a
 * page: objectives no source placed, regions the sources disagreed on, and
 * near-miss name pairs that may or may not be the same mountain. It is written
 * on every run and is not committed — it is a worksheet for editing
 * curation.ts, and its entries are printed ready to paste there.
 */
import type { BuildResult } from './build.ts'
import type { Claim, Objective } from './types.ts'
import { regionsOf } from './build.ts'
import { REGIONS } from './regions.ts'
import { isStated } from './types.ts'

/** Similarity above which two names are worth a human looking at them. */
const NEAR_MISS_CUTOFF = 0.86

function sources(objective: Objective): string {
  return [...new Set(objective.reports.map(report => report.sourceId))].join(', ')
}

function unplacedSection(unplaced: readonly Objective[]): string[] {
  if (unplaced.length === 0) return ['No unplaced objectives.', '']
  return [
    `${unplaced.length} objectives that no source placed. Give each one a region id`,
    '(or `out-of-scope`) in REGION_OVERRIDES in curation.ts:',
    '',
    '```ts',
    ...unplaced.map(objective =>
      `  '${objective.key}': '', // ${objective.name} — ${sources(objective)}\n`
      + `  //   ${objective.reports[0]?.url ?? ''}`),
    '```',
    '',
    `Valid region ids: ${REGIONS.map(region => region.id).join(', ')}, out-of-scope.`,
    ''
  ]
}

/** "stated by explor8ion", "linked from anugara (3 of 4)" — terse, for the worksheet only. */
function claimText(claim: Claim): string {
  const signal = claim.signal
  const text = signalText(signal)
  return 'weak' in signal && signal.weak ? `${text}, weak` : text
}

function signalText(signal: Claim['signal']): string {
  switch (signal.kind) {
    case 'stated': return signal.sourceId
    case 'linked': return `${signal.sourceId} links ${signal.agreeing}/${signal.total}`
    case 'sub-range': return `${signal.sourceId} sub-range ${signal.subRange}`
    case 'trailhead': return `${signal.sourceId} trailhead`
    default: return signal.kind
  }
}

function claimsText(objective: Objective): string {
  return regionsOf(objective)
    .map(regionId => `${regionId} (${objective.claims.filter(claim => claim.regionId === regionId).map(claimText).join(', ')})`)
    .join(' vs ')
}

function multiRegionSection(objectives: readonly Objective[]): string[] {
  const listed = objectives.filter(objective => regionsOf(objective).length > 1)
  if (listed.length === 0) return ['No objective is listed in more than one region.', '']
  return [
    `${listed.length} objectives listed in more than one region, strongest claim first. That is`,
    'intended where the objective sits on a boundary. Where one region is simply wrong, a',
    'REGION_OVERRIDES entry replaces every claim with the curated one:',
    '',
    ...listed.map(objective => `- **${objective.name}** → ${claimsText(objective)}`),
    ''
  ]
}

function inferredOnlySection(objectives: readonly Objective[]): string[] {
  const inferred = objectives.filter(objective => objective.claims.length > 0 && !objective.claims.some(isStated))
  if (inferred.length === 0) return ['No objective is placed by inference alone.', '']
  return [
    `${inferred.length} objectives placed only by inference. These are the ones to spot-check:`,
    'about one in ten is expected to be wrong.',
    '',
    ...inferred.map(objective => `- **${objective.name}** → ${claimsText(objective)} — ${objective.reports[0]?.url ?? ''}`),
    ''
  ]
}

/**
 * Character-bigram similarity — enough to surface candidates, and deliberately
 * never acted on automatically. See the note in canon.ts for why.
 */
function similarity(left: string, right: string): number {
  const bigrams = (value: string) => {
    const pairs = new Map<string, number>()
    for (let index = 0; index < value.length - 1; index += 1) {
      const pair = value.slice(index, index + 2)
      pairs.set(pair, (pairs.get(pair) ?? 0) + 1)
    }
    return pairs
  }
  const a = bigrams(left)
  const b = bigrams(right)
  let shared = 0
  for (const [pair, count] of a) shared += Math.min(count, b.get(pair) ?? 0)
  const total = (left.length - 1) + (right.length - 1)
  return total > 0 ? (2 * shared) / total : 0
}

function nearMissSection(result: BuildResult): string[] {
  const keys = [...new Set(result.objectives.map(objective => objective.key))].sort()
  const pairs: string[] = []
  for (let index = 0; index < keys.length; index += 1) {
    for (let other = index + 1; other < Math.min(index + 12, keys.length); other += 1) {
      const [left, right] = [keys[index]!, keys[other]!]
      if (similarity(left, right) >= NEAR_MISS_CUTOFF) pairs.push(`- \`${left}\` vs \`${right}\``)
    }
  }
  return [
    `${pairs.length} near-miss name pairs. Most are distinct neighbouring peaks — Explor8ion`,
    'alone publishes both Mount Kitchener and Mount Michener. Add an ALIASES entry only',
    'for a pair you have confirmed is one mountain spelled two ways:',
    '',
    ...pairs,
    ''
  ]
}

/** `generatedOn` is supplied by the caller, so the worksheet is a pure function of its inputs. */
export function writeReview(result: BuildResult, generatedOn: Date): string {
  return [
    '# Trip report index — review',
    '',
    `Generated by \`mise run build-trip-index\` on ${generatedOn.toISOString().slice(0, 10)} (UTC).`,
    'Not committed. Work through it, edit `scripts/trip-report-index/curation.ts`, re-run.',
    '',
    '## Unplaced objectives',
    '',
    ...unplacedSection(result.unplaced),
    '## Listed in more than one region',
    '',
    ...multiRegionSection(result.objectives),
    '## Placed by inference alone',
    '',
    ...inferredOnlySection(result.objectives),
    '## Possible duplicate names',
    '',
    ...nearMissSection(result)
  ].join('\n')
}
