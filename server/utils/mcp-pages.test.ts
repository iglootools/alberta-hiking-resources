import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getPage, listPages, onlyPages, rawMarkdownPath, type PageSummary } from './mcp-pages.ts'

const SITE = 'https://example.org'
const PAGE: PageSummary = { title: 'Accommodation', path: '/accommodation', description: 'Where to sleep' }

/** Records what each call to logError received. */
function errorLog() {
  const logged: unknown[][] = []
  return { logged, logError: (...args: unknown[]) => void logged.push(args) }
}

test('onlyPages keeps Markdown pages and leaves out .navigation.yml', () => {
  const conditions: unknown[][] = []
  const query = { where: (...args: unknown[]) => (conditions.push(args), query) }
  assert.equal(onlyPages(query), query)
  assert.deepEqual(conditions, [['extension', '=', 'md']])
})

test('rawMarkdownPath points at the /raw route', () => {
  assert.equal(rawMarkdownPath('/accommodation/huts'), '/raw/accommodation/huts.md')
})

test('listPages lists every page with its absolute URL', async () => {
  const result = await listPages({ siteUrl: SITE, logError: errorLog().logError, findPages: async () => [PAGE] })
  assert.equal(result.isError, undefined)
  assert.deepEqual(JSON.parse(result.content[0]!.text), [{ ...PAGE, url: 'https://example.org/accommodation' }])
})

test('listPages logs a failed query and answers with a generic error', async () => {
  const log = errorLog()
  const cause = new Error('database locked')
  const result = await listPages({ siteUrl: SITE, logError: log.logError, findPages: () => Promise.reject(cause) })
  assert.deepEqual(result, { content: [{ type: 'text', text: 'Failed to list pages' }], isError: true })
  assert.deepEqual(log.logged, [['[mcp] list-pages failed', cause]])
})

test('getPage returns the page, its Markdown and its absolute URL', async () => {
  const fetched: string[] = []
  const result = await getPage('/accommodation', {
    siteUrl: SITE,
    logError: errorLog().logError,
    findPage: async path => (path === PAGE.path ? PAGE : null),
    fetch: async (path) => {
      fetched.push(path)
      return new Response('# Accommodation')
    }
  })
  assert.equal(result.isError, undefined)
  assert.deepEqual(fetched, ['/raw/accommodation.md'])
  assert.deepEqual(JSON.parse(result.content[0]!.text), { ...PAGE, content: '# Accommodation', url: 'https://example.org/accommodation' })
})

test('getPage reports a missing page as an error, without fetching anything', async () => {
  const log = errorLog()
  const result = await getPage('/nope', {
    siteUrl: SITE,
    logError: log.logError,
    findPage: async () => null,
    fetch: () => assert.fail('fetched the Markdown of a missing page')
  })
  assert.deepEqual(result, { content: [{ type: 'text', text: 'Page not found' }], isError: true })
  assert.deepEqual(log.logged, [])
})

test('getPage logs a failed Markdown fetch and answers with a generic error', async () => {
  const log = errorLog()
  const result = await getPage('/accommodation', {
    siteUrl: SITE,
    logError: log.logError,
    findPage: async () => PAGE,
    fetch: async () => new Response('gone', { status: 404 })
  })
  assert.deepEqual(result, { content: [{ type: 'text', text: 'Failed to get page' }], isError: true })
  assert.equal(log.logged.length, 1)
  assert.equal(log.logged[0]![0], '[mcp] get-page failed')
  assert.match(String(log.logged[0]![1]), /\/raw\/accommodation\.md answered 404/)
})
