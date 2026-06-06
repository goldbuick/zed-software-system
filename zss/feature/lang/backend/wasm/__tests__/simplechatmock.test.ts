jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  PERF_UI: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
  WASM_SCRIPT: false,
}))

import { type CHIP, createchip } from 'zss/chip'
import { readcorpus } from 'zss/feature/lang/backend/wasm/corpus'
import { compilenativewasm } from 'zss/feature/lang/backend/wasm/langparityload'
import { loadscriptsync } from 'zss/feature/lang/wasmloader'
import { DRIVER_TYPE } from 'zss/firmware/runner'
import type { WORD } from 'zss/words/types'

describe('simple_chat wasm mock chip', () => {
  const source = readcorpus('integration', 'simple_chat_player')

  function runmock() {
    const wasmbytes = compilenativewasm(source)
    const texts: string[] = []
    let ec = 1
    let ys = 0
    let lc = 0
    const chip = {
      sy: () => {
        if (ys) {
          return true
        }
        if (typeof lc === 'number') {
          return ++lc > 512
        }
        return true
      },
      getcase: () => ec,
      nextcase: () => {
        ec++
      },
      jump: (line: number) => {
        ec = line
      },
      yield: () => {
        ys = 1
      },
      text: (value: WORD) => {
        texts.push(`${value}`)
        return 0
      },
      command: (...words: WORD[]) => {
        const [name] = words
        if (name === 'idle') {
          ys = 1
        }
        return 0
      },
      if: (...words: WORD[]) => {
        const [head] = words
        if (head === 'hint') {
          return 0
        }
        if (head === 'inputmenu') {
          return 0
        }
        if (head === 'inputmove') {
          return 0
        }
        return 0
      },
      stat: () => 0,
      hyperlink: () => 0,
      template: (words: WORD[]) => words.join(' '),
      get: () => undefined,
      set: () => undefined,
      and: () => 0,
      or: () => 0,
      not: () => 0,
      expr: () => 0,
      isEq: () => 0,
      isNotEq: () => 0,
      isLessThan: () => 0,
      isGreaterThan: () => 0,
      isLessThanOrEq: () => 0,
      isGreaterThanOrEq: () => 0,
      opPlus: () => 0,
      opMinus: () => 0,
      opPower: () => 0,
      opMultiply: () => 0,
      opDivide: () => 0,
      opModDivide: () => 0,
      opFloorDivide: () => 0,
      opUniPlus: () => 0,
      opUniMinus: () => 0,
      print: () => '',
      try: () => 0,
      take: () => 0,
      give: () => 0,
      duplicate: () => 0,
      repeatstart: () => undefined,
      repeat: () => 0,
      foreachstart: () => 0,
      foreach: () => 0,
      waitfor: () => 0,
    } as unknown as CHIP

    const run = () => {
      ys = 0
      lc = 0
      return loadscriptsync(wasmbytes, chip).run()
    }

    return { run, texts, getec: () => ec }
  }

  it('first run reaches sidebar text before yield', () => {
    const mock = runmock()
    const result = mock.run()
    expect(result).toBe(1)
    expect(mock.getec()).toBeGreaterThan(30)
    expect(mock.texts.length).toBeGreaterThan(0)
    expect(mock.texts[0]).toContain('Simple')
  }, 30000)
})
