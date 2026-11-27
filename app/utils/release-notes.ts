import type { MDCElement, MDCNode, MDCRoot } from '@nuxtjs/mdc'

/**
 * The elements plain Markdown produces, each with the properties it may keep.
 * Raw HTML and MDC components (`::alert`, `:icon`, `{style="…"}` attributes)
 * parse to other tags or properties, and are what this leaves out.
 */
const PLAIN_MARKDOWN: Readonly<Record<string, readonly string[]>> = {
  p: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
  ul: [],
  ol: ['start'],
  li: [],
  a: ['href', 'title'],
  strong: [],
  em: [],
  del: [],
  code: [],
  pre: ['language', 'code'],
  blockquote: [],
  hr: [],
  br: [],
  table: [],
  thead: [],
  tbody: [],
  tr: [],
  th: [],
  td: []
}

/** Elements whose text is not prose, so unwrapping them would show code as text. */
const DROPPED = new Set(['script', 'style', 'template'])

/**
 * Reduces a parsed Markdown tree to plain Markdown, for text from a source
 * this site does not control, such as release notes read through ungh.cc.
 *
 * An element plain Markdown does not produce is replaced by its children, so
 * its text survives without its markup; a property not listed for its element
 * is dropped. Comments are dropped.
 */
export function toPlainMarkdown(root: MDCRoot): MDCRoot {
  return { type: 'root', children: root.children.flatMap(plainNodes) }
}

function plainNodes(node: MDCNode): MDCNode[] {
  if (node.type === 'text') return [node]
  if (node.type === 'comment' || DROPPED.has(node.tag)) return []
  const children = node.children.flatMap(plainNodes)
  const allowedProps = PLAIN_MARKDOWN[node.tag]
  if (!allowedProps) return children
  const element: MDCElement = { type: 'element', tag: node.tag, props: pickProps(node.props, allowedProps), children }
  return [element]
}

function pickProps(props: MDCElement['props'], allowed: readonly string[]): MDCElement['props'] {
  return Object.fromEntries(Object.entries(props ?? {}).filter(([name]) => allowed.includes(name)))
}
