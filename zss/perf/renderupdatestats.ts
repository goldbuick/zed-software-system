// thread-local counters for render-side activity (main thread)

let tileuploadcalls = 0
let tileuploadbytes = 0
let spriteeffectruns = 0
let tilerenderruns = 0

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

export function readrenderupdatestats() {
  return {
    tileuploadcalls,
    tileuploadbytes,
    spriteeffectruns,
    tilerenderruns,
  }
}
