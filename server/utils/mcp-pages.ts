/**
 * What the MCP tools in server/mcp/tools do with the docs collection, apart
 * from reaching it: the tools hand these functions the query and the fetch,
 * so the behaviour can be tested without a Nuxt server.
 */

/** A page as the MCP tools describe it. */
export interface PageSummary {
  title: string
  path: string
  description: string
}

/** An MCP tool's answer: one text block, flagged when it reports a failure. */
export interface ToolResult {
  content: { type: 'text', text: string }[]
  isError?: true
}

/** How the tools reach the outside world, given to them by the handler. */
export interface PageSource {
  /** The site's origin, which every page URL starts with. */
  siteUrl: string
  /** Records a failure the caller is shown only as a generic message. */
  logError: (message: string, error: unknown) => void
}

/**
 * Restricts a docs-collection query to pages. The collection also holds each
 * folder's .navigation.yml, which is navigation metadata, not a page; the
 * sitemap and llms.txt skip it too.
 */
export function onlyPages<Q extends { where: (field: 'extension', operator: '=', value: 'md') => Q }>(query: Q): Q {
  return query.where('extension', '=', 'md')
}

/** The route serving a page's Markdown source. */
export function rawMarkdownPath(path: string): string {
  return `/raw${path}.md`
}

/** Every page, with its absolute URL. */
export async function listPages(source: PageSource & {
  findPages: () => Promise<PageSummary[]>
}): Promise<ToolResult> {
  try {
    const pages = await source.findPages()
    const result = pages.map(page => ({
      title: page.title,
      path: page.path,
      description: page.description,
      url: `${source.siteUrl}${page.path}`
    }))
    return text(JSON.stringify(result, null, 2))
  } catch (error) {
    // The caller sees only a generic failure, so the cause has to reach the
    // server log or it is lost entirely.
    source.logError('[mcp] list-pages failed', error)
    return failure('Failed to list pages')
  }
}

/** One page with its Markdown source and absolute URL, or an error result when there is no such page. */
export async function getPage(path: string, source: PageSource & {
  findPage: (path: string) => Promise<PageSummary | null>
  fetch: (path: string) => Promise<Response>
}): Promise<ToolResult> {
  try {
    const page = await source.findPage(path)
    if (!page) return failure('Page not found')

    const rawPath = rawMarkdownPath(path)
    const response = await source.fetch(rawPath)
    if (!response.ok) {
      throw new Error(`${rawPath} answered ${response.status}`)
    }
    const content = await response.text()

    const result = {
      title: page.title,
      path: page.path,
      description: page.description,
      content,
      url: `${source.siteUrl}${page.path}`
    }
    return text(JSON.stringify(result, null, 2))
  } catch (error) {
    // As in listPages: the cause has to reach the server log.
    source.logError('[mcp] get-page failed', error)
    return failure('Failed to get page')
  }
}

function text(value: string): ToolResult {
  return { content: [{ type: 'text', text: value }] }
}

function failure(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true }
}
