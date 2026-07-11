/** @jest-environment jsdom */

jest.mock('zss/feature/wanix/wanixstateexport', () => ({
  readzedcafeexportstatscontentready: jest.fn(() => false),
}))

jest.mock('zss/feature/wanix/zedcafetreeschema', () => ({
  kebabcasezedcafedirname: jest.fn(
    (name: string | undefined, id: string) =>
      name ? `${String(name).toLowerCase()}-${id}` : id,
  ),
}))

import {
  collectzedcafeexportfiles,
  resetzedcafestate,
} from 'zss/device/wanix/zedcafehost'
import { readwanixzedcafeexportsrc } from 'zss/feature/wanix/wanixzedcafeconstants'
import type { WanixRoot } from 'zss/feature/wanix/wanixelements.d.ts'

function encode(text: string): Uint8Array {
  return Uint8Array.from(Array.from(text).map((ch) => ch.charCodeAt(0)))
}

describe('collectzedcafeexportfiles', () => {
  afterEach(() => {
    resetzedcafestate()
  })

  it('walks directories whose names contain dots (page ids)', async () => {
    const book = 'coolregionsbow-sid_vuYEPNKWWAPd'
    const page = `${book}/key-sid_8FzEX.FvcYV1`
    const pagestats = `${page}/stats.json`
    const base = readwanixzedcafeexportsrc('2')
    const tree: Record<string, string[] | Uint8Array> = {
      [base]: [book],
      [`${base}/${book}`]: ['stats.json', 'key-sid_8FzEX.FvcYV1'],
      [`${base}/${book}/stats.json`]: encode(
        JSON.stringify({
          id: 'sid_vuYEPNKWWAPd',
          pages: [{ id: 'sid_8FzEX.FvcYV1', name: 'key' }],
        }),
      ),
      [`${base}/${page}`]: ['stats.json'],
      [`${base}/${pagestats}`]: encode(
        JSON.stringify({ id: 'sid_8FzEX.FvcYV1', code: '@object key\n' }),
      ),
    }

    const root: WanixRoot = {
      readDir: async (path: string) => {
        const entries = tree[path]
        if (!Array.isArray(entries)) {
          throw new Error(`not a dir: ${path}`)
        }
        return entries
      },
      readFile: async (path: string) => {
        const data = tree[path]
        if (!(data instanceof Uint8Array)) {
          throw new Error(`not a file: ${path}`)
        }
        return data
      },
      readText: async () => '',
      writeFile: async () => {},
      makeDirAll: async () => {},
      appendFile: async () => {},
      remove: async () => {},
      bind: async () => {},
      unbind: async () => {},
    }

    const files = await collectzedcafeexportfiles(root, '2')
    const paths = files.map((file) => file.path).sort()
    expect(paths).toContain(`${book}/stats.json`)
    expect(paths).toContain(pagestats)
  })
})
