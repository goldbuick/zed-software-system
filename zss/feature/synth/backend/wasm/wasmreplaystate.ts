import type { WASM_ALGO_CONFIG } from './wasmalgoconfigsab'
import type { WASM_OSC_CONFIG } from './wasmoscconfigsab'
import type { WASM_VOICE_STATE } from './wasmvoiceconfig'

export type WASM_REPLAY_STATE = {
  voicecfg: WASM_VOICE_STATE[]
  oscconfig: WASM_OSC_CONFIG[]
  algoconfig: WASM_ALGO_CONFIG[]
  fxsab: number[]
  playvolume: number
  bgplayvolume: number
}

export function clonewasmreplaystate(
  state: WASM_REPLAY_STATE,
): WASM_REPLAY_STATE {
  return {
    voicecfg: state.voicecfg.map((item) => ({
      ...item,
      envelope: { ...item.envelope },
    })),
    oscconfig: state.oscconfig.map((item) => ({
      ...item,
      partials: [...item.partials],
      modenv: { ...item.modenv },
    })),
    algoconfig: state.algoconfig.map((item) => ({
      ...item,
      env1: { ...item.env1 },
      env2: { ...item.env2 },
      env3: { ...item.env3 },
      env4: { ...item.env4 },
    })),
    fxsab: state.fxsab.slice(),
    playvolume: state.playvolume,
    bgplayvolume: state.bgplayvolume,
  }
}
