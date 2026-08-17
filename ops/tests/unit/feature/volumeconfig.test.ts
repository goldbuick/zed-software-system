jest.mock('zss/feature/storage', () => ({
  storagereadconfigstring: jest.fn(),
  storagewriteconfigstring: jest.fn(),
}))

import {
  storagereadconfigstring,
  storagewriteconfigstring,
} from 'zss/feature/storage'
import {
  migratevolumekeysifneeded,
  restorevolumesfromstorage,
  storevolumeconfig,
} from 'zss/feature/synth/volumeconfig'
import type { SynthBackend } from 'zss/feature/synth/frontend/synthbackend'

function mockbackend(): SynthBackend {
  return {
    addplay: jest.fn(),
    addbgplay: jest.fn(),
    stopplay: jest.fn(),
    setmainvolume: jest.fn(),
    setplayvolume: jest.fn(),
    setbgplayvolume: jest.fn(),
    setttsvolume: jest.fn(),
    setvoiceconfig: jest.fn(),
    applyvoicefx: jest.fn(),
    replayvoicefx: jest.fn(),
    synthrecord: jest.fn(),
    synthflush: jest.fn(),
    playaudiobuffer: jest.fn(),
    broadcastdestination: jest.fn(),
    destroy: jest.fn(),
  }
}

describe('volume config persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('storevolumeconfig writes config_* string keys', () => {
    storevolumeconfig('vol', 30)
    storevolumeconfig('playvol', 90)
    storevolumeconfig('bgvol', 40)
    storevolumeconfig('ttsvol', 80)
    expect(storagewriteconfigstring).toHaveBeenCalledWith('vol', '30')
    expect(storagewriteconfigstring).toHaveBeenCalledWith('playvol', '90')
    expect(storagewriteconfigstring).toHaveBeenCalledWith('bgvol', '40')
    expect(storagewriteconfigstring).toHaveBeenCalledWith('ttsvol', '80')
  })

  it('restorevolumesfromstorage applies saved volumes to backend', async () => {
    jest
      .mocked(storagereadconfigstring)
      .mockImplementation(async (name: string) => {
        if (name === 'vol') {
          return '40'
        }
        if (name === 'playvol') {
          return '80'
        }
        if (name === 'bgvol') {
          return '45'
        }
        if (name === 'ttsvol') {
          return '70'
        }
        return undefined
      })
    const backend = mockbackend()
    await restorevolumesfromstorage(backend)
    expect(backend.setmainvolume).toHaveBeenCalledWith(40)
    expect(backend.setplayvolume).toHaveBeenCalledWith(80)
    expect(backend.setbgplayvolume).toHaveBeenCalledWith(45)
    expect(backend.setttsvolume).toHaveBeenCalledWith(70)
  })

  it('restorevolumesfromstorage applies defaults when keys are missing or invalid', async () => {
    jest
      .mocked(storagereadconfigstring)
      .mockImplementation(async (name: string) => {
        if (name === 'vol') {
          return 'not-a-number'
        }
        if (name === 'bgvol') {
          return ''
        }
        return undefined
      })
    const backend = mockbackend()
    await restorevolumesfromstorage(backend)
    expect(backend.setmainvolume).toHaveBeenCalledWith(50)
    expect(backend.setplayvolume).toHaveBeenCalledWith(90)
    expect(backend.setbgplayvolume).toHaveBeenCalledWith(90)
    expect(backend.setttsvolume).toHaveBeenCalledWith(90)
  })

  it('migratevolumekeysifneeded moves old vol to playvol', async () => {
    jest
      .mocked(storagereadconfigstring)
      .mockImplementation(async (name: string) => {
        if (name === 'playvol') {
          return undefined
        }
        if (name === 'vol') {
          return '33'
        }
        return undefined
      })
    await migratevolumekeysifneeded()
    expect(storagewriteconfigstring).toHaveBeenCalledWith('playvol', '33')
    expect(storagewriteconfigstring).toHaveBeenCalledWith('vol', '50')
  })
})
