/** @jest-environment jsdom */

jest.mock('zss/device/wanixserver/exportevents', () => ({
  postwanixexportmessage: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixperf', () => ({
  wanixperfmark: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixstateexport', () => ({
  readzedcafeexportstatscontentready: jest.fn(() => true),
}))

jest.mock('zss/feature/wanix/zedcafetreeschema', () => ({
  kebabcasezedcafedirname: jest.fn(
    (name: string | undefined, id: string) =>
      name ? `${String(name).toLowerCase()}-${id}` : id,
  ),
  isallowedexportpath: jest.fn((path: string) => {
    if (!path || path.includes('..') || path.startsWith('/')) {
      return false
    }
    return path.endsWith('.json')
  }),
}))

import { pushzedcafeexportlive } from 'zss/device/wanixserver/zedcafehost'
import { readwanixzedcafeexportsrc } from 'zss/feature/wanix/wanixzedcafeconstants'
import type { WanixRoot } from 'zss/feature/wanix/wanixelements.d.ts'
import { TextEncoder } from 'util'

describe('pushzedcafeexportlive removepaths', () => {
  it('removes allowlisted paths before writing upserts', async () => {
    const removed: string[] = []
    const written: string[] = []
    const taskrid = '7'
    const base = readwanixzedcafeexportsrc(taskrid)
    const root: WanixRoot = {
      readDir: async () => [],
      readFile: async () => new Uint8Array(),
      readText: async () => '',
      writeFile: async (path) => {
        written.push(path)
      },
      makeDirAll: async () => {},
      appendFile: async () => {},
      remove: async (path) => {
        removed.push(path)
      },
      bind: async () => {},
      unbind: async () => {},
      waitFor: async () => {},
      openReadable: async () => new ReadableStream(),
      openWritable: async () => new WritableStream(),
    }

    await pushzedcafeexportlive(
      root,
      taskrid,
      [
        {
          path: 'stats.json',
          data: [
            ...new TextEncoder().encode(
              '{"exportedAt":"t","bookCount":0,"books":[]}\n',
            ),
          ],
        },
      ],
      ['demo-book1/demo-page1/board/objects/oid.json', '../escape.json'],
    )

    expect(removed).toEqual([
      `${base}/demo-book1/demo-page1/board/objects/oid.json`,
    ])
    expect(written).toEqual([`${base}/stats.json`])
  })

  it('ignores missing-file remove errors', async () => {
    const taskrid = '7'
    const root: WanixRoot = {
      readDir: async () => [],
      readFile: async () => new Uint8Array(),
      readText: async () => '',
      writeFile: async () => {},
      makeDirAll: async () => {},
      appendFile: async () => {},
      remove: async () => {
        throw new Error('no such file or directory')
      },
      bind: async () => {},
      unbind: async () => {},
      waitFor: async () => {},
      openReadable: async () => new ReadableStream(),
      openWritable: async () => new WritableStream(),
    }

    await expect(
      pushzedcafeexportlive(root, taskrid, [], [
        'demo-book1/demo-page1/board/objects/oid.json',
      ]),
    ).resolves.toBeUndefined()
  })
})
