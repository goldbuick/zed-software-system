// thread-local counters for render-side activity (main thread)

let tileuploadcalls = 0
let tileuploadbytes = 0
let spriteeffectruns = 0
let tilerenderruns = 0

let gadgetapplycalls = 0
let gadgetapplydeepcopyms = 0
let gadgetapplyapplyms = 0
let gadgetapplypatchops = 0

let unicodescanruns = 0
let unicodescancells = 0
let unicodescanglyphs = 0

let filterrebuildiso = 0
let filterrebuildfpv = 0
let filterrebuildmode7 = 0

export function recordtiletextureupload(bytes: number) {
  tileuploadcalls += 1
  tileuploadbytes += bytes
}

export function recordspriteeffectrun() {
  spriteeffectruns += 1
}

export function recordtilerenderrun() {
  tilerenderruns += 1
}

export function recordgadgetapply(
  deepcopyms: number,
  applyms: number,
  patchops: number,
) {
  gadgetapplycalls += 1
  gadgetapplydeepcopyms += deepcopyms
  gadgetapplyapplyms += applyms
  gadgetapplypatchops += patchops
}

export function recordunicodescan(cellsscanned: number, glyphsfound: number) {
  unicodescanruns += 1
  unicodescancells += cellsscanned
  unicodescanglyphs += glyphsfound
}

export type FILTER_REBUILD_MODE = 'iso' | 'fpv' | 'mode7'

export function recordfilterrebuild(mode: FILTER_REBUILD_MODE) {
  switch (mode) {
    case 'iso':
      filterrebuildiso += 1
      break
    case 'fpv':
      filterrebuildfpv += 1
      break
    case 'mode7':
      filterrebuildmode7 += 1
      break
  }
}

export function readrenderupdatestats() {
  return {
    tileuploadcalls,
    tileuploadbytes,
    spriteeffectruns,
    tilerenderruns,
    gadgetapplycalls,
    gadgetapplydeepcopyms,
    gadgetapplyapplyms,
    gadgetapplypatchops,
    unicodescanruns,
    unicodescancells,
    unicodescanglyphs,
    filterrebuildiso,
    filterrebuildfpv,
    filterrebuildmode7,
  }
}
