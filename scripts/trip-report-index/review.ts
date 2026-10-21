/**
 * The curation worksheet.
 *
 * Everything the run could not decide by itself ends up here rather than in a
 * page: objectives no source placed, regions the sources disagreed on, and
 * near-miss name pairs that may or may not be the same mountain. It is written
 * on every run and is not committed — it is a worksheet for editing
 * curation.ts, and its entries are printed ready to paste there.
 */
import type { BuildResult, Dropped } from './build.ts'
import type { Claim, Objective } from './types.ts'
import { regionsOf } from './build.ts'
import { DISTINCT_NAMES } from './curation.ts'
import { REGIONS } from './regions.ts'
import { isStated } from './types.ts'

/** Similarity above which two names are worth a human looking at them. */
const NEAR_MISS_CUTOFF = 0.86

const distinct = new Set(DISTINCT_NAMES.flatMap(([left, right]) => [`${left}|${right}`, `${right}|${left}`]))

/** Whether a candidate pair has been checked and found to be two objectives. */
function isDistinct(left: string, right: string): boolean {
  return distinct.has(`${left}|${right}`)
}

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
    case 'companion': return `${signal.sourceId} same report ${signal.agreeing}/${signal.total}`
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

/**
 * Names listed as more than one objective. A split is right for two mountains
 * sharing a name, and wrong when a blog's region label is broader than it
 * looks — Steven Song's "BC Rockies", which put Mount Robson 300 km from Mount
 * Robson. The fix for a wrong one is in the label's REGION_MAP entry, or a
 * REPORT_OBJECTIVES entry renaming the stray report's objective.
 */
function splitSection(objectives: readonly Objective[]): string[] {
  const byKey = new Map<string, Objective[]>()
  for (const objective of objectives) byKey.set(objective.key, [...(byKey.get(objective.key) ?? []), objective])
  const split = [...byKey.values()].filter(group => group.length > 1)
  if (split.length === 0) return ['No name is split into separate mountains.', '']
  return [
    `${split.length} names belong to more than one mountain: blogs file them in regions no`,
    'border connects, or one blog files them in two. Each line is one mountain:',
    '',
    ...split.flatMap(group => [
      `- **${group[0]!.name}**`,
      ...group.map(objective => `  - ${regionsOf(objective).join(', ')} — ${sources(objective)}`)
    ]),
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
      if (similarity(left, right) >= NEAR_MISS_CUTOFF && !isDistinct(left, right)) pairs.push(`- \`${left}\` vs \`${right}\``)
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

/** The generic words a bare name may have dropped, as the forms to look for. */
const GENERIC_FORMS: readonly ((bare: string) => string)[] = [
  bare => `mount ${bare}`,
  bare => `${bare} mountain`,
  bare => `${bare} peak`
]

const GENERIC_WORD = /\b(?:mount|mountain|peak|ridge|hill|lake|pass|tower|butte|glacier|falls|creek|valley|dome|spire|needle|col)\b/

/**
 * Names written without their generic — Bill Kerr's "Brett" and "Lady
 * MacDonald", Andrew Nugara's "Edith Cavell" — beside the one spelling that
 * adds it back. Edit distance does not see these, the gap being a whole word,
 * and an exact key cannot merge them.
 *
 * Only a name with exactly one such form is listed: "Cascade" is both Mount
 * Cascade and Cascade Mountain, and choosing between them is not a spelling
 * question. Like near misses, these are candidates for ALIASES, never acted on
 * automatically.
 */
export function bareNameCandidates(keys: ReadonlySet<string>): [string, string][] {
  return [...keys].sort().flatMap((key) => {
    if (GENERIC_WORD.test(key) || /\d/.test(key)) return []
    const forms = GENERIC_FORMS.map(form => form(key)).filter(form => keys.has(form))
    return forms.length === 1 && !isDistinct(key, forms[0]!) ? [[key, forms[0]!] as [string, string]] : []
  })
}

function bareNameSection(result: BuildResult): string[] {
  const candidates = bareNameCandidates(new Set(result.objectives.map(objective => objective.key)))
  return [
    `${candidates.length} names that may be another objective without its "Mount", "Mountain" or`,
    '"Peak". Check each against the report, then add it to ALIASES or, if the two are different',
    'places, to DISTINCT_NAMES so it is not offered again:',
    '',
    '```ts',
    ...candidates.map(([bare, full]) => `  '${bare}': '${full}',`),
    '```',
    ''
  ]
}

function newlyUnsortedSection(newlyUnsorted: readonly Objective[]): string[] {
  if (newlyUnsorted.length === 0) return ['Nothing is new on the catch-all page since the version this run replaced.', '']
  return [
    `${newlyUnsorted.length} objectives are new on the catch-all page since the version this run`,
    'replaced — usually reports a blog has published since the last refresh. These are the',
    'ones to place first, before they pile up:',
    '',
    ...newlyUnsorted.map(objective => `- **${objective.name}** — ${sources(objective)} — ${objective.reports[0]?.url ?? ''}`),
    ''
  ]
}

const DROP_REASONS: Readonly<Record<Dropped['reason'], string>> = {
  'curated': 'Set out of scope in REGION_OVERRIDES',
  'filed-elsewhere': 'Filed by a blog somewhere this site does not cover, and placed here by nothing it states',
  'outside': 'Positioned by a trailhead or the map far from every region'
}

function droppedSection(dropped: readonly Dropped[]): string[] {
  const reasons = Object.keys(DROP_REASONS) as Dropped['reason'][]
  return [
    `${dropped.length} names left off every page as out of scope. A wrong one disappears from the`,
    'site without trace, so skim for a peak this site covers; a REGION_OVERRIDES entry naming',
    'its region brings it back. Pages a source adapter drops as not being trips at all are not',
    'listed here.',
    '',
    ...reasons.flatMap((reason) => {
      const entries = dropped.filter(entry => entry.reason === reason)
      return entries.length === 0
        ? []
        : [
            `### ${DROP_REASONS[reason]} (${entries.length})`,
            '',
            ...entries.map(entry => `- \`${entry.key}\`${entry.sourceIds.length ? ` (${entry.sourceIds.join(', ')})` : ''} — ${entry.url}`),
            ''
          ]
    })
  ]
}

/** What a run knows beyond the build itself. */
export interface ReviewContext {
  /** Unplaced objectives that were not on the catch-all page this run replaced. */
  readonly newlyUnsorted?: readonly Objective[]
}

/** `generatedOn` is supplied by the caller, so the worksheet is a pure function of its inputs. */
export function writeReview(result: BuildResult, generatedOn: Date, { newlyUnsorted = [] }: ReviewContext = {}): string {
  return [
    '# Trip report index — review',
    '',
    `Generated by \`mise run build-trip-index\` on ${generatedOn.toISOString().slice(0, 10)} (UTC).`,
    'Not committed. Work through it, edit `scripts/trip-report-index/curation.ts`, re-run.',
    '',
    '## New on the catch-all page',
    '',
    ...newlyUnsortedSection(newlyUnsorted),
    '## Unplaced objectives',
    '',
    ...unplacedSection(result.unplaced),
    '## Listed in more than one region',
    '',
    ...multiRegionSection(result.objectives),
    '## Split into separate mountains',
    '',
    ...splitSection(result.objectives),
    '## Placed by inference alone',
    '',
    ...inferredOnlySection(result.objectives),
    '## Possible duplicate names',
    '',
    ...nearMissSection(result),
    '## Names without their generic',
    '',
    ...bareNameSection(result),
    '## Dropped as out of scope',
    '',
    ...droppedSection(result.dropped)
  ].join('\n')
}
