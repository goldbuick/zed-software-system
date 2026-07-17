import {
  WANIX_FSA_BIND_REQUEST,
  readwanixfsahandlekind,
  sanitizewanixfsadst,
} from 'zss/feature/wanix/wanixfsapaths'
import { partitioncafedrop } from 'zss/device/wanixclient/wanixfsadropitems'

describe('wanixfsapaths', () => {
  describe('sanitizewanixfsadst', () => {
    it('keeps a simple folder name', () => {
      expect(sanitizewanixfsadst('MyProject')).toBe('MyProject')
    })

    it('uses the basename of a path-like name', () => {
      expect(sanitizewanixfsadst('/tmp/foo/bar')).toBe('bar')
      expect(sanitizewanixfsadst('foo\\bar')).toBe('bar')
    })

    it('rejects empty, dots, spaces, and hash', () => {
      expect(sanitizewanixfsadst('')).toBeUndefined()
      expect(sanitizewanixfsadst('..')).toBeUndefined()
      expect(sanitizewanixfsadst('.')).toBeUndefined()
      expect(sanitizewanixfsadst('my project')).toBeUndefined()
      expect(sanitizewanixfsadst('#web')).toBeUndefined()
    })
  })

  describe('readwanixfsahandlekind', () => {
    it('classifies directory and file handles', () => {
      expect(readwanixfsahandlekind({ kind: 'directory' })).toBe('directory')
      expect(readwanixfsahandlekind({ kind: 'file' })).toBe('file')
      expect(readwanixfsahandlekind(null)).toBe('unsupported')
      expect(readwanixfsahandlekind({})).toBe('unsupported')
    })
  })

  it('exports the bind request id', () => {
    expect(WANIX_FSA_BIND_REQUEST).toBe('wanix-fsa-bind')
  })
})

describe('partitioncafedrop', () => {
  it('routes directory handles away from the file list', async () => {
    const dirhandle = { kind: 'directory', name: 'Assets' }
    const item = {
      kind: 'file',
      getAsFileSystemHandle: async () => dirhandle,
      getAsFile: () => new File(['x'], 'Assets'),
    }
    const dt = {
      items: [item],
      files: [],
    } as unknown as DataTransfer
    const part = await partitioncafedrop(dt)
    expect(part.directories).toHaveLength(1)
    expect(part.directories[0]).toBe(dirhandle)
    expect(part.files).toHaveLength(0)
    expect(part.unsupporteddirectory).toBe(false)
  })

  it('keeps regular files when handle is a file', async () => {
    const file = new File(['hi'], 'note.txt')
    const item = {
      kind: 'file',
      getAsFileSystemHandle: async () => ({ kind: 'file', name: 'note.txt' }),
      getAsFile: () => file,
    }
    const dt = {
      items: [item],
      files: [],
    } as unknown as DataTransfer
    const part = await partitioncafedrop(dt)
    expect(part.directories).toHaveLength(0)
    expect(part.files).toEqual([file])
  })

  it('flags unsupported directory entries without FSA', async () => {
    const item = {
      kind: 'file',
      webkitGetAsEntry: () => ({ isDirectory: true, isFile: false }),
      getAsFile: () => null,
    }
    const dt = {
      items: [item],
      files: [],
    } as unknown as DataTransfer
    const part = await partitioncafedrop(dt)
    expect(part.unsupporteddirectory).toBe(true)
    expect(part.directories).toHaveLength(0)
    expect(part.files).toHaveLength(0)
  })
})
