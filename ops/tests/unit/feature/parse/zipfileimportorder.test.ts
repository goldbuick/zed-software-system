import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import * as apimod from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  markzipfilelistitem,
  parsezipfile,
  parsezipfilelist,
  readzipfilelist,
  sortzipfilesforimport,
  zipfileimportpriority,
} from 'zss/feature/parse/file'
import * as chr from 'zss/feature/parse/chr'
import * as parsetxtmod from 'zss/feature/parse/parsetxt'
import * as zztmod from 'zss/feature/parse/zzt'

describe('zipfile import order', () => {
  it('prioritizes worlds then charset formats then everything else', () => {
    expect(zipfileimportpriority('zzt')).toBe(0)
    expect(zipfileimportpriority('szt')).toBe(0)
    expect(zipfileimportpriority('brd')).toBe(0)
    expect(zipfileimportpriority('fontcom')).toBe(1)
    expect(zipfileimportpriority('chr')).toBe(1)
    expect(zipfileimportpriority('txt')).toBe(2)
    expect(zipfileimportpriority('obj')).toBe(2)
  })

  it('sorts marked files worlds then charset then rest, stable by name', () => {
    const files = [
      new File([], 'Pokemon1.txt', { type: 'text/plain' }),
      new File([], 'Pokemon.com', { type: 'application/octet-stream' }),
      new File([], 'POKEMON1.ZZT', { type: 'application/x-zzt' }),
      new File([], 'extra.chr', { type: 'application/octet-stream' }),
      new File([], 'notes.ini', { type: 'text/x-ini' }),
    ]
    const ordered = sortzipfilesforimport(files)
    expect(ordered.map((f) => f.name)).toEqual([
      'POKEMON1.ZZT',
      'extra.chr',
      'Pokemon.com',
      'notes.ini',
      'Pokemon1.txt',
    ])
    expect(zipfileimportpriority('zzt')).toBeLessThan(
      zipfileimportpriority('chr'),
    )
    expect(zipfileimportpriority('chr')).toBeLessThan(
      zipfileimportpriority('txt'),
    )
  })

  it('does not flush from zzt or super zzt parsers', () => {
    const src = readFileSync(
      join(__dirname, '../../../../../zss/feature/parse/zzt.ts'),
      'utf8',
    )
    expect(src.includes('vmflush')).toBe(false)
    const flush = jest.spyOn(apimod, 'vmflush').mockImplementation(() => {})
    zztmod.parsezzt('player', new Uint8Array([0, 0]))
    zztmod.parseszt('player', new Uint8Array([0, 0]))
    expect(flush).not.toHaveBeenCalled()
    flush.mockRestore()
  })

  it('omits nested zips and flushes once after the marked list', async () => {
    const flush = jest.spyOn(apimod, 'vmflush').mockImplementation(() => {})
    const toast = jest.spyOn(apimod, 'apitoast').mockImplementation(() => {})
    const order: string[] = []
    const parsezztspy = jest
      .spyOn(zztmod, 'parsezzt')
      .mockImplementation(() => {
        order.push('zzt')
      })
    const parsechrspy = jest.spyOn(chr, 'parsechr').mockImplementation(() => {
      order.push('chr')
    })
    const parsetxtspy = jest
      .spyOn(parsetxtmod, 'parsetxt')
      .mockImplementation(() => {
        order.push('txt')
      })
    const inner = new JSZip()
    inner.file('nope.txt', 'x')
    const innerbytes = await inner.generateAsync({ type: 'uint8array' })
    const outer = new JSZip()
    outer.file('notes.txt', 'hello')
    outer.file('POKEMON1.ZZT', new Uint8Array([0xff, 0xff]))
    outer.file('extra.chr', new Uint8Array([1]))
    outer.file('inner.zip', innerbytes)
    const outerbytes = await outer.generateAsync({ type: 'uint8array' })
    const file = new File([outerbytes], 'pack.zip', {
      type: 'application/zip',
    })
    await parsezipfile('player', file)
    const list = readzipfilelist()
    expect(list.map((row) => row[0])).not.toContain('zip')
    expect(list.map((row) => row[1]).sort()).toEqual(
      ['POKEMON1.ZZT', 'extra.chr', 'notes.txt'].sort(),
    )
    expect(toast).toHaveBeenCalledWith(
      SOFTWARE,
      'player',
      'skipped 1 zip file inside zip',
    )
    for (let i = 0; i < list.length; ++i) {
      markzipfilelistitem(list[i][1], true)
    }
    await parsezipfilelist('player')
    expect(order).toEqual(['zzt', 'chr', 'txt'])
    expect(flush).toHaveBeenCalledTimes(1)
    expect(flush).toHaveBeenCalledWith(SOFTWARE, 'player')
    flush.mockRestore()
    toast.mockRestore()
    parsezztspy.mockRestore()
    parsechrspy.mockRestore()
    parsetxtspy.mockRestore()
  })
})
