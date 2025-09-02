// Type definitions for AnsiLove

export type Sauce = {
  version: string
  title: string
  author: string
  group: string
  date: string
  fileSize: number
  dataType: number
  fileType: number
  tInfo1: number
  tInfo2: number
  tInfo3: number
  tInfo4: number
  comments: string[]
  flags: number
  blinkMode: boolean
  letterSpacing: number
  aspectRatio: number
  tInfoS: string
}

export type FileObj = {
  get: () => number
  get16: () => number
  get32: () => number
  getC: () => string
  getS: (num: number) => string
  getSZ: (num: number) => string
  lookahead: (match: Uint8Array) => boolean
  read: (num?: number) => Uint8Array
  seek: (newPos: number) => void
  peek: (num?: number) => number
  getPos: () => number
  eof: () => boolean
  size: number
  sauce?: Sauce
}

export type Font = {
  getData: (
    charCode: number,
    palette: Uint8Array[],
    fg: number,
    bg: number,
  ) => Uint8Array
  get24BitData: (charCode: number, fg: Uint8Array, bg: Uint8Array) => Uint8Array
  height: number
  width: number
}

export type FontPreset = {
  width: number
  height: number
  data: string
  amigaFont: boolean
}

export type ScreenData = {
  columns: number
  rows: number
  reset: () => void
  set: (
    x: number,
    y: number,
    charCode: number,
    trueColor: boolean,
    fg: number | Uint8Array,
    bg: number | Uint8Array,
  ) => void
  raw: (bytes: Uint8Array) => void
  trimColumns: () => void
  getData: () => Uint8Array
  palette?: Uint8Array[]
  font?: Font
}

export type RenderOptions = {
  icecolors?: number
  bits?: '8' | '9' | 'ced' | 'workbench'
  columns?: number
  font?: string
  thumbnail?: number
  '2x'?: number
  imagedata?: number
  rows?: number
  '2J'?: number
  filetype?: string
  mode?: string
  spinner?: string
}

export type DisplayData = {
  width: number
  height: number
  rgbaData: Uint8Array
  '2x'?: number
}

export type ParsedData = {
  imageData: ScreenData
  sauce?: Sauce
}

export type AnimationController = {
  play: (baud?: number, callback?: () => void, clearScreen?: boolean) => void
  stop: () => void
  load: (bytes: Uint8Array, callback: (sauce?: Sauce) => void) => void
}

export type Ansimation = {
  canvas: HTMLCanvasElement
  sauce?: Sauce
  controller: AnimationController
}
