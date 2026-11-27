import assert from 'node:assert/strict'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import type { IndexBuild, IndexPaths } from '../run.ts'
import { buildObjectives } from '../build.ts'
import { GENERATED_PAGES } from '../pages.ts'
import { writeIndex } from '../run.ts'
import { tempDir } from './support.ts'

const build: IndexBuild = {
  reportCount: 1,
  result: buildObjectives([{ sourceId: 'test', title: 'Peak Untestable', url: 'https://x.test/1', objectives: ['Peak Untestable'] }]),
  map: { svg: { regions: [] }, geojson: { features: [] }, smallRegions: [] }
}
const startedAt = new Date('2026-01-01T00:00:00Z')

describe('writeIndex', async () => {
  const root = await tempDir()
  after(() => rm(root, { recursive: true, force: true }))
  let count = 0

  /** A fresh tree with an empty pages folder and nothing written yet. */
  async function tree(): Promise<IndexPaths> {
    const dir = join(root, String(count += 1))
    const paths = {
      pagesDir: join(dir, 'pages'),
      mirroredSections: [],
      cacheDir: join(dir, 'cache'),
      reviewPath: join(dir, 'review.md'),
      mapSvgPath: join(dir, 'region-map.json'),
      mapGeojsonPath: join(dir, 'region-map', 'regions.geojson')
    }
    await mkdir(paths.pagesDir, { recursive: true })
    return paths
  }

  it('writes the pages, the map and the review', async () => {
    const paths = await tree()
    await writeIndex(paths, build, { reviewOnly: false, startedAt })
    assert.deepEqual((await readdir(paths.pagesDir)).sort(), [...GENERATED_PAGES].sort())
    assert.deepEqual((await readdir(join(paths.pagesDir, '..'))).sort(),
      ['pages', 'region-map', 'region-map.json', 'review.md'])
  })

  it('writes only the review in review-only mode', async () => {
    const paths = await tree()
    await writeIndex(paths, build, { reviewOnly: true, startedAt })
    assert.deepEqual(await readdir(paths.pagesDir), [])
    assert.deepEqual((await readdir(join(paths.pagesDir, '..'))).sort(), ['pages', 'review.md'])
  })

  it('writes nothing when the pages folder holds a page it did not generate', async () => {
    const paths = await tree()
    await writeFile(join(paths.pagesDir, '98.guide.md'), '# How to read the index\n')
    await assert.rejects(writeIndex(paths, build, { reviewOnly: false, startedAt }), { name: 'UnknownPagesError' })
    assert.deepEqual(await readdir(paths.pagesDir), ['98.guide.md'])
    assert.deepEqual(await readdir(join(paths.pagesDir, '..')), ['pages'])
  })
})
