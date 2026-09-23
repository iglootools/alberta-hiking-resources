/**
 * Objective-name canonicalisation.
 *
 * Sources spell the same mountain differently — Bob Spirko inverts ("Albert,
 * Mount"), Explor8ion appends companions ("Aldridge, Mount (+ Courcelette,
 * Fording)"), Steep Sheep appends elevation ("Mount Temple 3544m"). `canonKey`
 * folds those into one matching key.
 *
 * Matching is deliberately EXACT on that key, never fuzzy. Mountain names are
 * short and share a small alphabet, so edit-distance matching conflates
 * genuinely distinct neighbouring peaks: Explor8ion alone publishes both
 * "Mount Kitchener" and "Mount Michener", both "Bow Peak" and "Owl Peak", both
 * "Mount Shark" and "Mount Shanks". Merging those would point a reader at beta
 * for the wrong mountain. Genuine spelling variants are curated by hand in
 * aliases.ts instead, and `nearMisses` exists to surface candidates for that
 * file rather than to act on them.
 */

/** Trailing generic that a source moved to the front: "Albert, Mount". */
const INVERTED = /^(.*?),\s*(Mount|Mt\.?|The|Peak|Mountain|Ridge|Lake|Hill)$/i

/** The same inversion with a route or feature still attached: "Buller, Mount North Ridge". */
const INVERTED_WITH_SUFFIX = /^(.*?),\s*(Mount|Mt\.?|The)\s+(.+)$/i

/**
 * Separators a source uses to join several summits in one title, where
 * Explor8ion's own convention would be "(+ …)". Only unambiguous, space-padded
 * separators are listed: a comma would split "Albert, Mount" in half.
 */
const OBJECTIVE_SEPARATOR = /\s+(?:[&|]|\/)\s+/

/** A parenthetical listing companion summits: "(+ Courcelette, Fording)". */
const COMPANIONS = /\(([^()]*)\)/g

/** Elevation suffixes that only some sources publish: "Mount Temple 3544m". */
const ELEVATION = /\s+\d{3,5}\s*m\b/gi

const COMPANION_SEPARATOR = /\s*(?:[,&+]|\band\b)\s*/

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{Mn}/gu, '')
}

/**
 * Splits a source's report title into its primary objective and any companion
 * summits it names. Only a `+`-prefixed parenthetical is treated as companions;
 * a bare one is an aside ("Janelea Mountain (Little Tombstone)") and is dropped
 * from the name rather than promoted to an objective of its own.
 */
export function splitCompanions(title: string): { primary: string, companions: string[] } {
  const companions: string[] = []
  const primary = title.replace(COMPANIONS, (_match, body: string) => {
    const inner = body.trim()
    if (!inner.startsWith('+')) return ' '
    companions.push(...inner.slice(1).split(COMPANION_SEPARATOR).map(part => part.trim()).filter(Boolean))
    return ' '
  })
  return { primary: primary.replace(ELEVATION, '').trim().replace(/[\s\-–—&+]+$/, '').trim(), companions }
}

/** Turns "Albert, Mount" into "Mount Albert"; leaves already-ordered names alone. */
export function uninvert(name: string): string {
  const trimmed = name.trim()
  const match = INVERTED.exec(trimmed)
  if (match) {
    const [, head, tail] = match
    return `${normaliseGeneric(tail!)} ${head!.trim()}`
  }
  const withSuffix = INVERTED_WITH_SUFFIX.exec(trimmed)
  if (withSuffix) {
    const [, head, generic, suffix] = withSuffix
    return `${normaliseGeneric(generic!)} ${head!.trim()} ${suffix!.trim()}`
  }
  return trimmed
}

function normaliseGeneric(generic: string): string {
  return /^mt\.?$/i.test(generic) ? 'Mount' : generic
}

/**
 * Every objective one report covers, primary first.
 *
 * A combined trip is indexed under each of its summits, which is the point of
 * the index: "Blakiston, Mount & Hawkins & Lineham" should be findable from any
 * of the three. Sources announce this two ways — Explor8ion's "(+ …)" suffix,
 * and a plain "&", "|" or "/" between names — so both are handled here rather
 * than in each adapter.
 */
export function splitObjectives(title: string): string[] {
  const { primary, companions } = splitCompanions(title)
  const parts = [...primary.split(OBJECTIVE_SEPARATOR), ...companions]
  return parts.map(part => part.trim()).filter(Boolean)
}

/** The display form: uninverted, de-elevationed, whitespace-collapsed. */
export function displayName(title: string): string {
  return uninvert(splitCompanions(title).primary).replace(/\s+/g, ' ').trim()
}

/** The exact-match key two sources must agree on to be treated as one objective. */
export function canonKey(title: string): string {
  return stripAccents(displayName(title))
    .toLowerCase()
    .replace(/[‘’“”'"`]/g, '')
    .replace(/\bmt\.?\b/g, 'mount')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the\s+/, '')
    .replace(/\s+/g, ' ')
}
