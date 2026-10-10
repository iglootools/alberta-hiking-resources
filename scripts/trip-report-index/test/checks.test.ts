import assert from 'node:assert/strict'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { checkIndexLinks, checkMirroredSections } from '../checks.ts'
import { tempDir } from './support.ts'

describe('consistency checks', async () => {
  const root = await tempDir()
  after(() => rm(root, { recursive: true, force: true }))

  const index = join(root, '01.index.md')
  await writeFile(index, '[Banff](/hiking-scrambling-beta/trip-reports/banff)\n')

  it('passes when every region is linked from the index', async () => {
    await checkIndexLinks(index, ['banff'])
  })

  it('names the regions the index does not link', async () => {
    await assert.rejects(checkIndexLinks(index, ['banff', 'yoho', 'jasper-robson']),
      { name: 'UnlinkedRegionsError', page: '01.index.md', missing: ['yoho', 'jasper-robson'] })
  })

  it('fails on a missing index rather than skipping the check', async () => {
    await assert.rejects(checkIndexLinks(join(root, 'absent.md'), ['banff']), { code: 'ENOENT' })
  })

  it('names the regions a mirrored section has no page for, ignoring the numeric prefix', async () => {
    const weather = join(root, 'weather')
    await mkdir(weather)
    await writeFile(join(weather, '05.banff.md'), '')
    await checkMirroredSections([weather], ['banff'])
    await assert.rejects(checkMirroredSections([weather], ['banff', 'yoho']),
      { name: 'MissingMirroredPagesError', dir: weather, missing: ['yoho'] })
  })
})
