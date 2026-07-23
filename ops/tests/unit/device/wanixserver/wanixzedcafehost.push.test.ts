/** @jest-environment jsdom */

jest.mock('zss/device/wanixserver/exportevents', () => ({
  postwanixexportmessage: jest.fn(),
  postzedcafefilechangemessage: jest.fn(),
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

import {
  notifyzedcafeexportdirtyfortest,
  pushzedcafeexportlive,
} from 'zss/device/wanixserver/zedcafehost'
import { postzedcafefilechangemessage } from 'zss/device/wanixserver/exportevents'
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
    expect(written).toEqual([
      `${base}/stats.json`,
      `${base}/zedsync/revision`,
    ])
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

  it('treats directory-not-empty remove as benign', async () => {
    const errors: unknown[] = []
    const spy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args)
    })
    const taskrid = '7'
    const root: WanixRoot = {
      readDir: async () => [],
      readFile: async () => new Uint8Array(),
      readText: async () => '',
      writeFile: async () => {},
      makeDirAll: async () => {},
      appendFile: async () => {},
      remove: async () => {
        throw new Error(
          'remove demo-book1/demo-page1/board/objects: directory not empty',
        )
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
    expect(errors).toEqual([])
    spy.mockRestore()
  })

  it('materializes parent dirs before parallel writes and tolerates EEXIST', async () => {
    const taskrid = '7'
    const base = readwanixzedcafeexportsrc(taskrid)
    const mkdircalls: string[] = []
    const written: string[] = []
    const root: WanixRoot = {
      readDir: async () => [],
      readFile: async () => new Uint8Array(),
      readText: async () => '',
      writeFile: async (path) => {
        written.push(path)
      },
      makeDirAll: async (path) => {
        mkdircalls.push(path)
        if (mkdircalls.length === 1) {
          throw new Error(
            'mkdir coolregionsbow-sid_x/ammo-sid_y: file already exists',
          )
        }
      },
      appendFile: async () => {},
      remove: async () => {},
      bind: async () => {},
      unbind: async () => {},
      waitFor: async () => {},
      openReadable: async () => new ReadableStream(),
      openWritable: async () => new WritableStream(),
    }

    await expect(
      pushzedcafeexportlive(root, taskrid, [
        {
          path: 'coolregionsbow-sid_x/ammo-sid_y/board/terrain.json',
          data: [...new TextEncoder().encode('[0]\n')],
        },
        {
          path: 'coolregionsbow-sid_x/ammo-sid_y/board/objects/oid.json',
          data: [...new TextEncoder().encode('{}\n')],
        },
        {
          path: 'coolregionsbow-sid_x/ammo-sid_y/object/element.json',
          data: [...new TextEncoder().encode('{}\n')],
        },
        {
          path: 'stats.json',
          data: [
            ...new TextEncoder().encode(
              '{"exportedAt":"t","bookCount":0,"books":[]}\n',
            ),
          ],
        },
      ]),
    ).resolves.toBeUndefined()

    // Shallow parents before nested (book before page before board/objects).
    const boarddir = `${base}/coolregionsbow-sid_x/ammo-sid_y/board`
    const objectsdir = `${base}/coolregionsbow-sid_x/ammo-sid_y/board/objects`
    const objectdir = `${base}/coolregionsbow-sid_x/ammo-sid_y/object`
    expect(mkdircalls.indexOf(boarddir)).toBeLessThan(
      mkdircalls.indexOf(objectsdir),
    )
    expect(mkdircalls).toContain(objectdir)
    expect(written).toContain(
      `${base}/coolregionsbow-sid_x/ammo-sid_y/board/terrain.json`,
    )
    expect(written).toContain(`${base}/stats.json`)
  })
})

describe('pushzedcafeexportlive dirty queue', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('queues dirty notify during push and flushes after suppress window', async () => {
    const taskrid = '7'
    let releasewrite: (() => void) | undefined
    const writestalled = new Promise<void>((resolve) => {
      releasewrite = resolve
    })
    const root: WanixRoot = {
      readDir: async () => [],
      readFile: async () => new Uint8Array(),
      readText: async () => '',
      writeFile: async (path) => {
        if (path.endsWith('stats.json')) {
          await writestalled
        }
      },
      makeDirAll: async () => {},
      appendFile: async () => {},
      remove: async () => {},
      bind: async () => {},
      unbind: async () => {},
      waitFor: async () => {},
      openReadable: async () => new ReadableStream(),
      openWritable: async () => new WritableStream(),
    }

    const pushpromise = pushzedcafeexportlive(root, taskrid, [
      {
        path: 'stats.json',
        data: [
          ...new TextEncoder().encode(
            '{"exportedAt":"t","bookCount":0,"books":[]}\n',
          ),
        ],
      },
    ])

    notifyzedcafeexportdirtyfortest(taskrid, ['book/flags/pid_1.json'])
    expect(postzedcafefilechangemessage).not.toHaveBeenCalled()

    releasewrite?.()
    await pushpromise
    jest.advanceTimersByTime(75)

    expect(postzedcafefilechangemessage).toHaveBeenCalledTimes(1)
    expect(postzedcafefilechangemessage).toHaveBeenCalledWith(taskrid, [
      'book/flags/pid_1.json',
    ])
  })

  it('merges multiple dirty paths queued during push', async () => {
    const taskrid = '7'
    let releasewrite: (() => void) | undefined
    const writestalled = new Promise<void>((resolve) => {
      releasewrite = resolve
    })
    const root: WanixRoot = {
      readDir: async () => [],
      readFile: async () => new Uint8Array(),
      readText: async () => '',
      writeFile: async (path) => {
        if (path.endsWith('stats.json')) {
          await writestalled
        }
      },
      makeDirAll: async () => {},
      appendFile: async () => {},
      remove: async () => {},
      bind: async () => {},
      unbind: async () => {},
      waitFor: async () => {},
      openReadable: async () => new ReadableStream(),
      openWritable: async () => new WritableStream(),
    }

    const pushpromise = pushzedcafeexportlive(root, taskrid, [
      {
        path: 'stats.json',
        data: [
          ...new TextEncoder().encode(
            '{"exportedAt":"t","bookCount":0,"books":[]}\n',
          ),
        ],
      },
    ])

    notifyzedcafeexportdirtyfortest(taskrid, ['z.json', 'a.json'])
    notifyzedcafeexportdirtyfortest(taskrid, ['m.json'])

    releasewrite?.()
    await pushpromise
    jest.advanceTimersByTime(75)

    expect(postzedcafefilechangemessage).toHaveBeenCalledWith(taskrid, [
      'a.json',
      'm.json',
      'z.json',
    ])
  })
})
