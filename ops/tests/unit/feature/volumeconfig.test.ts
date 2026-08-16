jest.mock('zss/feature/storage', () => ({
  storagereadconfigstring: jest.fn(),
  storagewriteconfigstring: jest.fn(),
}))

jest.mock('zss/feature/mediaqueue/boardtvaudio', () => ({
  mediaqueuesetplayvolume: jest.fn(),
}))

import {
  storagereadconfigstring,
  storagewriteconfigstring,
} from 'zss/feature/storage'
import { mediaqueuesetplayvolume } from 'zss/feature/mediaqueue/boardtvaudio'
import {
  restorevolumesfromstorage,
  storevolumeconfig,
} from 'zss/feature/synth/volumeconfig'
import type { SynthBackend } from 'zss/feature/synth/frontend/synthbackend'

function mockbackend(): SynthBackend {
  return {
    addplay: jest.fn(),
    addbgplay: jest.fn(),
    stopplay: jest.fn(),
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
    storevolumeconfig('bgvol', 40)
    storevolumeconfig('ttsvol', 80)
    expect(storagewriteconfigstring).toHaveBeenCalledWith('vol', '30')
    expect(storagewriteconfigstring).toHaveBeenCalledWith('bgvol', '40')
    expect(storagewriteconfigstring).toHaveBeenCalledWith('ttsvol', '80')
  })

  it('restorevolumesfromstorage applies saved volumes to backend', async () => {
    jest
      .mocked(storagereadconfigstring)
      .mockImplementation(async (name: string) => {
        if (name === 'vol') {
          return '20'
        }
        if (name === 'bgvol') {
          return '45'
        }
        if (name === 'ttsvol') {
          return '90'
        }
        return undefined
      })
    const backend = mockbackend()
    await restorevolumesfromstorage(backend)
    expect(backend.setplayvolume).toHaveBeenCalledWith(20)
    expect(backend.setbgplayvolume).toHaveBeenCalledWith(45)
    expect(backend.setttsvolume).toHaveBeenCalledWith(90)
    expect(mediaqueuesetplayvolume).toHaveBeenCalledWith(20)
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
    expect(backend.setplayvolume).toHaveBeenCalledWith(50)
    expect(backend.setbgplayvolume).toHaveBeenCalledWith(50)
    expect(backend.setttsvolume).toHaveBeenCalledWith(100)
    expect(mediaqueuesetplayvolume).toHaveBeenCalledWith(50)
  })
})
