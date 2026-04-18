/**
 * Manual benchmark (not run by Jest — path matches `\\.bench\\.ts$` ignore).
 *
 *   yarn tsx zss/feature/__tests__/netformat.bench.ts
 */
import type { MESSAGE } from 'zss/device/api'
import { netformatencode, netserializable } from 'zss/feature/netformat'

function samplepaint(): MESSAGE {
  const slim: unknown[] = []
  for (let i = 0; i < 400; ++i) {
    slim.push(i, i % 7, `k${i}`, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  }
  return {
    session: 'bench_sess',
    player: 'bench_player',
    id: 'sid_bench',
    sender: 'vm',
    target: 'gadgetclient:paint',
    data: slim,
  }
}

function benchbytes(label: string, bytes: Uint8Array | string) {
  const n =
    typeof bytes === 'string'
      ? new TextEncoder().encode(bytes).length
      : bytes.length

  console.info(`${label} bytes: ${n}`)
}

function benchms(label: string, fn: () => void, iterations: number) {
  const t0 = performance.now()
  for (let i = 0; i < iterations; ++i) {
    fn()
  }
  const ms = (performance.now() - t0) / iterations

  console.info(`${label} avg ms (${iterations} runs): ${ms.toFixed(3)}`)
}

const msg = samplepaint()
const jsonwire = JSON.stringify(netserializable(msg))
const cborwire = netformatencode(msg)

benchbytes('JSON.stringify(serializable)', jsonwire)
benchbytes('netformatencode (CBOR)', cborwire)

benchms(
  'JSON.stringify',
  () => {
    void JSON.stringify(netserializable(msg))
  },
  80,
)

benchms(
  'netformatencode',
  () => {
    void netformatencode(msg)
  },
  80,
)

console.info('netformat bench done')
