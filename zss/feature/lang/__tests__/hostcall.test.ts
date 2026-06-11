import type { CHIP } from 'zss/chip'
import { HOST, createhostimports } from 'zss/feature/lang/hostcall'
import type { WORD } from 'zss/words/types'

function pushstring(
  host: ReturnType<typeof createhostimports>['host'],
  mem: WebAssembly.Memory,
  offset: number,
  text: string,
) {
  const bytes = new TextEncoder().encode(text)
  new Uint8Array(mem.buffer).set(bytes, offset)
  host.push_str(offset, bytes.length)
}

describe('wasm host arg stack', () => {
  it('preserves mixed string and number push order for COMMAND', () => {
    const mem = new WebAssembly.Memory({ initial: 1 })
    const memref = { current: mem }
    const invoked: WORD[][] = []
    const chip = {
      command(...words: WORD[]) {
        invoked.push(words)
        return 0
      },
    } as unknown as CHIP

    const { host } = createhostimports(chip, memref)
    let offset = 0
    for (const text of ['set', 'light', 'pick']) {
      pushstring(host, mem, offset, text)
      offset += 32
    }
    for (const value of [5, 7, 11, 12]) {
      host.push_i32(value)
    }

    host.call(HOST.COMMAND)

    expect(invoked).toEqual([['set', 'light', 'pick', 5, 7, 11, 12]])
  })

  it('EXPR host call consumes all pushed words for pick', () => {
    const mem = new WebAssembly.Memory({ initial: 1 })
    const memref = { current: mem }
    const exprinputs: WORD[][] = []
    const chip = {
      expr(...words: WORD[]) {
        exprinputs.push(words)
        return words[0] === 'pick' ? 11 : 0
      },
    } as unknown as CHIP

    const { host } = createhostimports(chip, memref)
    let offset = 0
    for (const text of ['pick', '5', '7', '11', '12']) {
      pushstring(host, mem, offset, text)
      offset += 32
    }

    host.call(HOST.EXPR)

    expect(exprinputs).toEqual([['pick', '5', '7', '11', '12']])
  })

  it('TEMPLATE host call expands $flags without disturbing prior stack words', () => {
    const mem = new WebAssembly.Memory({ initial: 1 })
    const memref = { current: mem }
    const invoked: WORD[][] = []
    const chip = {
      template(words: WORD[]) {
        return words.join(' ') === 'key$color' ? 'key9' : words.join(' ')
      },
      command(...words: WORD[]) {
        invoked.push(words)
        return 0
      },
    } as unknown as CHIP

    const { host } = createhostimports(chip, memref)
    let offset = 0
    pushstring(host, mem, offset, 'set')
    offset += 32
    pushstring(host, mem, offset, 'key$color')
    offset += 32
    host.call(HOST.TEMPLATE)
    host.call(HOST.COMMAND)

    expect(invoked).toEqual([['set', 'key9']])
  })

  it('API host call pushes non-number results onto the arg stack', () => {
    const mem = new WebAssembly.Memory({ initial: 1 })
    const memref = { current: mem }
    const captured: WORD[] = []
    const chip = {
      echo(value: string) {
        return value
      },
      command(...words: WORD[]) {
        captured.push(...words)
        return 0
      },
    } as unknown as CHIP

    const { host } = createhostimports(chip, memref)
    let offset = 0
    for (const text of ['echo', 'hello']) {
      pushstring(host, mem, offset, text)
      offset += 32
    }
    host.call(HOST.API)
    host.call(HOST.COMMAND)

    expect(captured).toEqual(['hello'])
  })
})
