// sub-set of AnsiLove.js TypeScript version

import { sauce, sauceBytes } from './file'
import { ParserModule } from './parser'
import type { RenderOptions, Sauce, ScreenData } from './types'

// Render functions
export function renderBytes(
  bytes: Uint8Array,
  options: RenderOptions = {},
  callback: (data: ScreenData, sauce?: Sauce) => void,
  callbackFail?: (error: unknown) => void,
): void {
  try {
    ParserModule.readBytes(
      bytes,
      callback as (data: ScreenData, sauce?: Sauce) => void,
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
  sauceBytes,
  sauce,
  renderBytes,
}

// // Web Worker support
// type WorkerGlobalScope = {
//   WorkerLocation?: unknown
//   onmessage?: (evt: MessageEvent) => void
//   postMessage: (message: unknown) => void
// }

// declare const self: WorkerGlobalScope | undefined

// if (self?.WorkerLocation) {
//   self.onmessage = function (evt: MessageEvent): void {
//     if (evt.data.bytes) {
//       AnsiLove.renderBytes(
//         evt.data.bytes,
//         evt.data
//         (imagedata: ScreenData, sauce?: Sauce): void => {
//           self.postMessage({ imagedata, sauce })
//         },
//       )
//     }
//   }
// }

export default AnsiLove
export * from './types'
