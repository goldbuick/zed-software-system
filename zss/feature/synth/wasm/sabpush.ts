import type { MaxiEngine } from './maximilian'

/** Push voice/drum state straight into the worklet (skip ring buffer — it stomps live values). */
export function pushwasmsabvalues(
  maxi: MaxiEngine,
  channelid: string,
  data: number[],
) {
  if (!maxi.audioWorkletNode?.port) {
    return
  }
  maxi.audioWorkletNode.port.postMessage({
    zss_sab_push: 1,
    channelID: channelid,
    data,
  })
}
