import {
  storagereadconfigstring,
  storagewriteconfigstring,
} from 'zss/feature/storage'
import {
  WASM_DEFAULT_BGPLAY_VOLUME,
  WASM_DEFAULT_PLAY_VOLUME,
  WASM_DEFAULT_TTS_VOLUME,
} from 'zss/feature/synth/backend/wasm/wasmmainsab'
import type { SynthBackend } from 'zss/feature/synth/frontend/synthbackend'
import { isnumber } from 'zss/mapping/types'

export type VOLUME_CONFIG_KEY = 'vol' | 'bgvol' | 'ttsvol'

const VOLUME_CONFIG_KEYS: VOLUME_CONFIG_KEY[] = ['vol', 'bgvol', 'ttsvol']

const VOLUME_DEFAULTS: Record<VOLUME_CONFIG_KEY, number> = {
  vol: WASM_DEFAULT_PLAY_VOLUME,
  bgvol: WASM_DEFAULT_BGPLAY_VOLUME,
  ttsvol: WASM_DEFAULT_TTS_VOLUME,
}

function parsevolumevalue(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') {
    return undefined
  }
  const volume = Number(raw)
  if (!isnumber(volume) || Number.isNaN(volume)) {
    return undefined
  }
  return volume
}

export function storevolumeconfig(key: VOLUME_CONFIG_KEY, volume: number) {
  void storagewriteconfigstring(key, String(volume))
}

export async function readplayvolumeconfig(): Promise<number> {
  const raw = await storagereadconfigstring('vol')
  return parsevolumevalue(raw) ?? WASM_DEFAULT_PLAY_VOLUME
}

export async function restorevolumesfromstorage(backend: SynthBackend) {
  for (const key of VOLUME_CONFIG_KEYS) {
    const raw = await storagereadconfigstring(key)
    const volume = parsevolumevalue(raw) ?? VOLUME_DEFAULTS[key]
    switch (key) {
      case 'vol':
        backend.setplayvolume(volume)
        break
      case 'bgvol':
        backend.setbgplayvolume(volume)
        break
      case 'ttsvol':
        backend.setttsvolume(volume)
        break
    }
  }
}
