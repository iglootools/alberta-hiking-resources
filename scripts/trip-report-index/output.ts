/**
 * Console formatting. Indentation is applied where a line is printed rather
 * than baked into the string, so the same text can be nested at any depth.
 */

const INDENT = '  '

export function indent(text: string, depth = 1): string {
  return `${INDENT.repeat(depth)}${text}`
}
