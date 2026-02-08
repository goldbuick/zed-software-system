import { Part, Player, Time, ToneAudioBuffer, getTransport } from 'tone'
import { ispresent } from 'zss/mapping/types'

import { createaudiochain } from './audiochain'
import { addfcrushmodule } from './fcrushworkletnode'
import { volumetodb } from './fx'
import {
  SYNTH_INVOKE,
  SYNTH_NOTE_ENTRY,
  SYNTH_SFX_RESET,
  invokeplay,
  parseplay,
} from './playnotation'
import { createrecordhandler } from './recordhandler'
import { addsidechainmodule } from './sidechainworkletnode'
import { SOURCE_TYPE } from './source'
import { createsourcefxsetup } from './sourcefxsetup'
import {
  type PLAYBACK_STATE,
  type RECORDING_STATE,
  createtickhandler,
} from './tickhandler'

export async function setupsynth() {
  await addfcrushmodule()
  await addsidechainmodule()
}

export function createsynth() {
  const chain = createaudiochain()
  const sourceFx = createsourcefxsetup(chain.playvolume, chain.bgplayvolume)
  const { SOURCE, FX, FXCHAIN, changesource } = sourceFx

  const recording: RECORDING_STATE = {
    recordedticks: [],
    recordlastpercent: 0,
    recordisrendering: 0,
  }

  const playback: PLAYBACK_STATE = {
    pacertime: -1,
    pacercount: 0,
    pacer: null!,
  }

  const synthtick = createtickhandler(sourceFx, chain, recording, playback)
  // @ts-expect-error Part callback type mismatch with SYNTH_NOTE_ON
  playback.pacer = new Part(synthtick)

  const { synthrecord, synthflush } = createrecordhandler(
    sourceFx,
    recording,
    setupsynth,
    createsynth,
  )

  let bgplayindex = SYNTH_SFX_RESET

  function applyreplay(source: any[], fxchain: any, fx: any[]) {
    source.forEach((item, index) => {
      changesource(index, item.type, item.algo)
      SOURCE[index].setreplay(item)
    })
    FXCHAIN.setreplay(fxchain)
    fx.forEach((item, index) => {
      FX[index].setreplay(item)
    })
  }

  function synthplaystart(
    idx: number,
    starttime: number,
    invoke: SYNTH_INVOKE,
    withendofpattern = true,
  ) {
    let endtime = starttime
    const pattern = invokeplay(idx, starttime, invoke, withendofpattern)
    const last = pattern[pattern.length - 1]
    if (ispresent(last)) {
      endtime = Math.max(endtime, last[0])
    }
    for (let p = 0; p < pattern.length; ++p) {
      const [time, value] = pattern[p]
      playback.pacer.add(time, value)
    }
    return endtime
  }

  function synthreplay(pattern: SYNTH_NOTE_ENTRY[], maxtime: number) {
    recording.recordlastpercent = 0
    recording.recordisrendering = maxtime
    for (let p = 0; p < pattern.length; ++p) {
      const [time, value] = pattern[p]
      playback.pacer.add(time, value)
    }
  }

  function addplay(buffer: string) {
    const invokes = parseplay(buffer)
    if (playback.pacertime === -1) {
      playback.pacertime = getTransport().now()
    }
    playback.pacercount += invokes.length
    const starttime = playback.pacertime
    for (let i = 0; i < invokes.length && i < SOURCE.length; ++i) {
      const endtime = synthplaystart(i, starttime, invokes[i])
      playback.pacertime = Math.max(playback.pacertime, endtime)
    }
  }

  function addbgplay(buffer: string, quantize: string) {
    const invokes = parseplay(buffer)
    const seconds = Time(quantize ? quantize : '+0.05').toSeconds()
    for (let i = 0; i < invokes.length; ++i) {
      synthplaystart(bgplayindex++, seconds, invokes[i], false)
      if (bgplayindex >= SOURCE.length) {
        bgplayindex = SYNTH_SFX_RESET
      }
    }
  }

  function stopplay() {
    playback.pacer.clear()
    playback.pacertime = -1
    playback.pacercount = 0
  }

  function setbpm(bpm: number) {
    stopplay()
    getTransport().bpm.setValueAtTime(bpm, 0)
    // @ts-expect-error Part callback type mismatch with SYNTH_NOTE_ON
    playback.pacer = new Part(synthtick)
    playback.pacer.start(0)
  }

  function setplayvolume(volume: number) {
    chain.mainvolume.volume.value = volumetodb(volume * 0.25)
  }

  function setbgplayvolume(volume: number) {
    chain.bgplayvolume.volume.value = volumetodb(volume)
  }

  function addaudiobuffer(audiobuffer: AudioBuffer | ToneAudioBuffer) {
    const player = new Player(audiobuffer).connect(chain.ttsvolume)
    player.start(0)
  }

  function setttsvolume(volume: number) {
    chain.ttsvolume.volume.value = volume
  }

  function applyreset() {
    SOURCE.forEach((item, index) => {
      const algo =
        item.source.type === SOURCE_TYPE.ALGO_SYNTH ? item.source.algo : 0
      changesource(index, SOURCE_TYPE.SYNTH, algo)
      item.applyreset()
      item.source.synth.set({
        oscillator: { type: 'square' },
      })
    })
    FX.forEach((item) => item.applyreset())
    FXCHAIN.applyreset()
  }

  function destroy() {
    SOURCE.forEach((item) => item.destroy())
    FX.forEach((item) => item.destroy())
    FXCHAIN.destroy()
    chain.mainvolume.dispose()
  }

  // defaults
  setttsvolume(25)
  setplayvolume(80)
  setbgplayvolume(100)
  playback.pacer.start(0)
  FXCHAIN.autofilter.start()

  return {
    destroy,
    broadcastdestination: chain.broadcastdestination,
    addplay,
    addbgplay,
    stopplay,
    applyreset,
    applyreplay,
    synthrecord,
    synthflush,
    synthreplay,
    addaudiobuffer,
    setbpm,
    setplayvolume,
    setbgplayvolume,
    setttsvolume,
    SOURCE,
    FX,
    FXCHAIN,
    changesource,
  }
}

export type AUDIO_SYNTH = ReturnType<typeof createsynth>
