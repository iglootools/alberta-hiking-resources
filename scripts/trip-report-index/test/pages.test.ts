import assert from 'node:assert/strict'
import { readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import type { RawReport } from '../types.ts'
import { buildObjectives } from '../build.ts'
import { canonKey } from '../canon.ts'
import { INDEX_PAGE, UNSORTED_PAGE, pageName, previouslyUnsorted, pruneStalePages, writeRegionPages } from '../pages.ts'
import { REGIONS } from '../regions.ts'
import { renderRegionPage } from '../render.ts'
import { tempDir } from './support.ts'

// Names no source or curation entry will ever mention: one placed in Banff by
// a guidebook region, one nothing places.
const PLACED = 'Mount Testington'
const UNPLACED = 'Peak Untestable'
const reportOf = (name: string): RawReport => ({ sourceId: 'test', title: name, url: `https://x.test/${name}`, objectives: [name] })
const result = buildObjectives([reportOf(PLACED), reportOf(UNPLACED)],
  { entries: new Map(), regions: new Map([[canonKey(PLACED), 'banff']]) })

const BANFF_PAGE = pageName(REGIONS.findIndex(region => region.id === 'banff') + 2, 'banff')

describe('region pages', async () => {
  const root = await tempDir()
  after(() => rm(root, { recursive: true, force: true }))
  let count = 0
  const pagesDir = async () => join(root, String(count += 1))

  it('writes a page per region and the catch-all page last', async () => {
    const dir = await pagesDir()
    const written = await writeRegionPages(dir, result, false)
    assert.equal(written.length, REGIONS.length + 1)
    assert.equal(written.at(-1), UNSORTED_PAGE)
    assert.deepEqual((await readdir(dir)).sort(), [...written].sort())
    assert.match(await readFile(join(dir, BANFF_PAGE), 'utf8'), new RegExp(PLACED))
    assert.match(await readFile(join(dir, UNSORTED_PAGE), 'utf8'), new RegExp(UNPLACED))
  })

  it('writes nothing in dry-run mode, but still names the pages', async () => {
    const dir = await pagesDir()
    const planned = await writeRegionPages(dir, result, true)
    assert.equal(planned.length, REGIONS.length + 1)
    await assert.rejects(readdir(dir), { code: 'ENOENT' })
  })

  it('pads the position so the sidebar sorts numerically', () => {
    assert.equal(pageName(2, 'banff'), '02.banff.md')
  })

  it('prunes pages no region produced, keeping the index and what was written', async () => {
    const dir = await pagesDir()
    const written = await writeRegionPages(dir, result, false)
    await writeFile(join(dir, INDEX_PAGE), 'hand-written')
    await writeFile(join(dir, '99.retired-region.md'), renderRegionPage(REGIONS[0]!, []))
    await writeFile(join(dir, 'notes.txt'), 'not a page')
    assert.deepEqual(await pruneStalePages(dir, new Set(written)), ['99.retired-region.md'])
    assert.deepEqual((await readdir(dir)).sort(), [...written, INDEX_PAGE, 'notes.txt'].sort())
  })

  it('refuses to prune a page it did not generate, deleting nothing', async () => {
    const dir = await pagesDir()
    const written = await writeRegionPages(dir, result, false)
    await writeFile(join(dir, '98.guide.md'), '# How to read the index\n')
    await writeFile(join(dir, '99.retired-region.md'), renderRegionPage(REGIONS[0]!, []))
    await assert.rejects(pruneStalePages(dir, new Set(written)),
      { name: 'UnknownPagesError', dir, pages: ['98.guide.md'] })
    assert.deepEqual((await readdir(dir)).sort(), [...written, '98.guide.md', '99.retired-region.md'].sort())
  })

  it('reads the names on the catch-all page the run replaces', async () => {
    const dir = await pagesDir()
    await writeRegionPages(dir, result, false)
    assert.deepEqual([...await previouslyUnsorted(dir)], [UNPLACED])
  })

  it('reads no names before the first run', async () => {
    assert.deepEqual(await previouslyUnsorted(await pagesDir()), new Set())
  })
})
