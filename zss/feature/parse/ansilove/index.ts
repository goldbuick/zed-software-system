// AnsiLove.js TypeScript version
// Main module that exports all public APIs

import { saucebytes } from './file'
import { ParserModule } from './parser'
import type { DisplayData, RenderOptions, Sauce } from './types'

// Render functions
export function renderbytes(
  bytes: Uint8Array,
  callback: (data: DisplayData, sauce?: Sauce) => void,
  options?: RenderOptions,
  callbackFail?: (error: unknown) => void,
): void {
  try {
    ParserModule.readbytes(
      bytes,
      callback as (data: DisplayData | DisplayData[], sauce?: Sauce) => void,
      0,
      options,
    )
  } catch (e) {
    if (callbackFail) {
      callbackFail(e)
    } else {
      throw e
    }
  }
}

// Split render functions
export function splitrenderbytes(
  bytes: Uint8Array,
  callback: (data: DisplayData | DisplayData[], sauce?: Sauce) => void,
  splitRows?: number,
  options?: RenderOptions,
  callbackFail?: (error: unknown) => void,
): void {
  try {
    ParserModule.readbytes(
      bytes,
      callback as (data: DisplayData | DisplayData[], sauce?: Sauce) => void,
      splitRows ?? 27,
      options,
    )
  } catch (e) {
    if (callbackFail) {
      callbackFail(e)
    } else {
      throw e
    }
  }
}

// Main AnsiLove object for compatibility
export const AnsiLove = {
  sauceBytes: saucebytes,
  renderBytes: renderbytes,
  splitRenderBytes: splitrenderbytes,
}

export default AnsiLove
