// ScreenData class for AnsiLove

import type { Font, ScreenData as ScreenDataType } from "./types"

export class ScreenData implements ScreenDataType {
  private imageData: Uint8Array
  private pos: number
  public columns: number
  public rows: number
  public palette?: Uint8Array[]
  public font?: Font

  constructor(columns: number) {
    this.columns = columns
    this.rows = 0
    this.pos = 0
    this.imageData = new Uint8Array(columns * 1000 * 10)
  }

  reset(): void {
    this.imageData = new Uint8Array(this.columns * 1000 * 10)
    this.pos = 0
    this.rows = 0
  }

  private extendImageData(y: number): void {
    const newImageData = new Uint8Array(this.columns * (y + 1000) * 10 + this.imageData.length)
    newImageData.set(this.imageData, 0)
    this.imageData = newImageData
  }

  set(x: number, y: number, charCode: number, trueColor: boolean, fg: number | Uint8Array, bg: number | Uint8Array): void {
    this.pos = (y * this.columns + x) * 10
    if (this.pos >= this.imageData.length) {
      this.extendImageData(y)
    }
    this.imageData[this.pos] = charCode
    if (trueColor) {
      this.imageData[this.pos + 1] = 1
      this.imageData.set(fg as Uint8Array, this.pos + 2)
      this.imageData.set(bg as Uint8Array, this.pos + 6)
    } else {
      this.imageData[this.pos + 2] = fg as number
      this.imageData[this.pos + 3] = bg as number
    }
    if (y + 1 > this.rows) {
      this.rows = y + 1
    }
  }

  raw(bytes: Uint8Array): void {
    this.rows = Math.ceil(bytes.length / 2 / this.columns)
    this.imageData = new Uint8Array(this.columns * this.rows * 10)
    for (let i = 0, j = 0; j < bytes.length; i += 10, j += 2) {
      this.imageData[i] = bytes[j]
      this.imageData[i + 2] = bytes[j + 1] & 15
      this.imageData[i + 3] = bytes[j + 1] >> 4
    }
  }

  trimColumns(): void {
    let maxX = 0
    const height = this.imageData.length / 10 / this.columns

    for (let i = 0; i < this.imageData.length; i += 10) {
      if (this.imageData[i]) {
        maxX = Math.max((i / 10) % this.columns, maxX)
      }
    }
    ++maxX

    const newImageData = new Uint8Array((maxX + 1) * height * 10)
    for (let i = 0, j = 0; i < newImageData.length; i += maxX * 10, j += this.columns * 10) {
      newImageData.set(this.imageData.subarray(j, j + this.columns * 10), i)
    }
    this.imageData = newImageData
    this.columns = maxX
  }

  getData(): Uint8Array {
    const subarray = this.imageData.subarray(0, this.columns * this.rows * 10)
    for (let i = 0; i < subarray.length; i += 10) {
      subarray[i + 5] = 255
      subarray[i + 9] = 255
    }
    return subarray
  }
}