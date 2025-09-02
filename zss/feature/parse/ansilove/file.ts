// File handling module for AnsiLove

import type { FileObj, Sauce } from './types'

export class File implements FileObj {
  private pos: number
  private bytes: Uint8Array
  public size: number
  public sauce?: Sauce

  private SAUCE_ID = new Uint8Array([0x53, 0x41, 0x55, 0x43, 0x45])
  private COMNT_ID = new Uint8Array([0x43, 0x4f, 0x4d, 0x4e, 0x54])

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
    this.pos = 0
    this.size = bytes.length
    this.parseSauce()
  }

  get(): number {
    if (this.pos >= this.bytes.length) {
      throw new Error('Unexpected end of file reached.')
    }
    return this.bytes[this.pos++]
  }

  get16(): number {
    const v = this.get()
    return v + (this.get() << 8)
  }

  get32(): number {
    let v = this.get()
    v += this.get() << 8
    v += this.get() << 16
    return v + (this.get() << 24)
  }

  getC(): string {
    return String.fromCharCode(this.get())
  }

  getS(num: number): string {
    let string = ''
    while (num-- > 0) {
      string += this.getC()
    }
    return string.replace(/\s+$/, '')
  }

  getSZ(num: number): string {
    let string = ''
    let value: number
    while (num-- > 0) {
      value = this.get()
      if (value === 0) {
        break
      }
      string += String.fromCharCode(value)
    }
    return string
  }

  lookahead(match: Uint8Array): boolean {
    let i: number
    for (i = 0; i < match.length; ++i) {
      if (
        this.pos + i === this.bytes.length ||
        this.bytes[this.pos + i] !== match[i]
      ) {
        break
      }
    }
    return i === match.length
  }

  read(num?: number): Uint8Array {
    const t = this.pos
    num = num || this.size - this.pos
    while (++this.pos < this.size) {
      if (--num === 0) {
        break
      }
    }
    return this.bytes.subarray(t, this.pos)
  }

  seek(newPos: number): void {
    this.pos = newPos
  }

  peek(num?: number): number {
    num = num || 0
    return this.bytes[this.pos + num]
  }

  getPos(): number {
    return this.pos
  }

  eof(): boolean {
    return this.pos === this.size
  }

  private parseSauce(): void {
    // Seek to the position we would expect to find a SAUCE record.
    this.pos = this.bytes.length - 128
    if (this.lookahead(this.SAUCE_ID)) {
      this.sauce = {} as Sauce
      this.getS(5)
      this.sauce.version = this.getS(2)
      this.sauce.title = this.getS(35)
      this.sauce.author = this.getS(20)
      this.sauce.group = this.getS(20)
      this.sauce.date = this.getS(8)
      this.sauce.fileSize = this.get32()
      this.sauce.dataType = this.get()
      this.sauce.fileType = this.get()
      this.sauce.tInfo1 = this.get16()
      this.sauce.tInfo2 = this.get16()
      this.sauce.tInfo3 = this.get16()
      this.sauce.tInfo4 = this.get16()
      this.sauce.comments = []
      const commentCount = this.get()
      this.sauce.flags = this.get()
      this.sauce.blinkMode = (this.sauce.flags & 1) === 1
      this.sauce.letterSpacing = (this.sauce.flags >> 1) & 3
      this.sauce.aspectRatio = (this.sauce.flags >> 3) & 3
      this.sauce.tInfoS = this.getSZ(22)
      if (commentCount > 0) {
        this.pos = this.bytes.length - 128 - commentCount * 64 - 5
        if (this.lookahead(this.COMNT_ID)) {
          this.getS(5)
          let remaining = commentCount
          while (remaining-- > 0) {
            this.sauce.comments.push(this.getS(64))
          }
        }
      }
    }

    this.pos = 0

    if (this.sauce) {
      if (this.sauce.fileSize > 0 && this.sauce.fileSize < this.bytes.length) {
        this.size = this.sauce.fileSize
      } else {
        this.size = this.bytes.length - 128
      }
    } else {
      this.size = this.bytes.length
    }
  }
}

export function sauceBytes(bytes: Uint8Array): Sauce | undefined {
  return new File(bytes).sauce
}

export function httpGet(
  url: string,
  callback: (data: Uint8Array) => void,
  callbackFail?: (status: number) => void,
): void {
  const http = new XMLHttpRequest()

  http.open('GET', url, true)

  http.onreadystatechange = function (): void {
    if (http.readyState === 4) {
      switch (http.status) {
        case 0:
        case 200:
          callback(new Uint8Array(http.response as ArrayBuffer))
          break
        default:
          if (callbackFail) {
            callbackFail(http.status)
          }
      }
    }
  }

  http.responseType = 'arraybuffer'
  http.send()
}

export function sauce(
  url: string,
  callback: (sauce?: Sauce) => void,
  callbackFail?: (status: number) => void,
): void {
  httpGet(
    url,
    (bytes: Uint8Array): void => {
      callback(sauceBytes(bytes))
    },
    callbackFail,
  )
}
