import { createOS } from '/zss/os'

export type RACK = {
  //
}

export function createRack() {
  const os = createOS()

  const rack: RACK = {
    //
  }

  return rack
}

/*
  boot: (code: string, ...firmwares: FIRMWARE[]) => string
  halt: (id: string) => boolean
  active: (id: string) => boolean
  tick: (id: string) => void
  state: (id: string, name: string) => Record<string, object>


*/
