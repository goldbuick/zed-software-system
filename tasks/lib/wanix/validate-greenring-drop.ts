import { readFileSync } from 'node:fs'
import path from 'node:path'

import { WANIX_PUBLIC_FIXTURES_DIR } from 'ops/lib/fixturepaths'
import { PLAYWRIGHT_SCENARIO_TIMEOUT_MS } from 'tasks/lib/parity/parity-timeouts'
import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import { waitforregistersession } from 'tasks/lib/wanix/playwrightwaits'
import {
  type ZedcafeTimelineEntry,
  collectwanixperf,
  failzedcafegate,
  polluntil,
  readplaywrightlogs,
} from 'tasks/lib/wanix/playwrightzedcafe'
import { WANIX_ZEDCAFE_EXPORT_READY_POLL_MS } from 'zss/feature/wanix/wanixzedcafeconstants'

const VALIDATE_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS
const EXPORT_POLL_MS = WANIX_ZEDCAFE_EXPORT_READY_POLL_MS
const HASH_URL = 'https://localhost:7777/#cyanfiftycaseswatchyearly'
const RING_CHAR = 177
const RING_COLOR = 10
const RING_OFFSETS: [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
]
const IFRAME_CRASH_RE = /wanix iframe not loaded/i

type BoardRingSnap = {
  ready: boolean
  playerx: number | null
  playery: number | null
  ringhits: number
  ringneed: number
  detail: string
}

async function dropgreenringviawindow(
  page: import('@playwright/test').Page,
  fixturepath: string,
) {
  const bytes = readFileSync(fixturepath)
  await page.evaluate(async (filebytes) => {
    const file = new File([new Uint8Array(filebytes)], 'greenring.wasm', {
      type: 'application/wasm',
    })
    const dt = new DataTransfer()
    dt.items.add(file)
    window.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      }),
    )
  }, Array.from(bytes))
}

async function readboardringsnap(
  page: import('@playwright/test').Page,
  root: string,
): Promise<BoardRingSnap> {
  return page.evaluate(
    async ({ projectroot, ringchar, ringcolor, offsets }) => {
      const { useGadgetClient } = await import(
        `/@fs${projectroot}/zss/gadget/data/zustandstores.ts`
      )
      const { LAYER_TYPE } = await import(
        `/@fs${projectroot}/zss/gadget/data/types.ts`
      )
      const gadget = useGadgetClient.getState().gadget
      const layers = gadget.layers ?? []
      let playerx: number | null = null
      let playery: number | null = null
      for (const layer of layers) {
        if (layer.type !== LAYER_TYPE.SPRITES) {
          continue
        }
        for (const sprite of layer.sprites) {
          if (sprite.pid) {
            playerx = sprite.x
            playery = sprite.y
            break
          }
        }
        if (playerx != null) {
          break
        }
      }
      if (playerx == null || playery == null) {
        return {
          ready: false,
          playerx,
          playery,
          ringhits: 0,
          ringneed: offsets.length,
          detail: 'no player sprite with pid',
        }
      }
      let tiles: {
        width: number
        height: number
        char: number[]
        color: number[]
      } | null = null
      for (const layer of layers) {
        if (layer.type === LAYER_TYPE.TILES) {
          tiles = layer
          break
        }
      }
      if (!tiles) {
        return {
          ready: false,
          playerx,
          playery,
          ringhits: 0,
          ringneed: offsets.length,
          detail: 'no TILES layer',
        }
      }
      let ringhits = 0
      let ringneed = 0
      for (const [dx, dy] of offsets) {
        const x = playerx + dx
        const y = playery + dy
        if (x < 0 || y < 0 || x >= tiles.width || y >= tiles.height) {
          continue
        }
        ringneed += 1
        const idx = y * tiles.width + x
        if (tiles.char[idx] === ringchar && tiles.color[idx] === ringcolor) {
          ringhits += 1
        }
      }
      return {
        ready: ringneed > 0 && ringhits === ringneed,
        playerx,
        playery,
        ringhits,
        ringneed,
        detail: `player=${playerx},${playery} hits=${ringhits}/${ringneed}`,
      }
    },
    {
      projectroot: root,
      ringchar: RING_CHAR,
      ringcolor: RING_COLOR,
      offsets: RING_OFFSETS,
    },
  )
}

const validategreenringdrop: HeadedPlaywrightScript = async ({
  page,
  baseurl,
  root,
}) => {
  const start = Date.now()
  const timeline: ZedcafeTimelineEntry[] = []
  const consolelines: string[] = []
  const pagelogs: string[] = []
  let iframecrash = false
  let lastsnap: BoardRingSnap | null = null

  const record = (label: string, extra?: Record<string, unknown>) => {
    timeline.push({ ms: Date.now() - start, label, extra })
  }

  const fail = (gate: string, rpc: Record<string, unknown> = {}): never =>
    failzedcafegate(
      gate,
      {
        timeline,
        taskrid: null,
        rpc: { ...rpc, lastsnap },
        readdirerrors: [],
        walkbookserrors: [],
        termdump: '',
        termdumptail: '',
        recentlogs: pagelogs.slice(-80),
      },
      root,
    )

  await page.addInitScript(() => {
    const g = globalThis as {
      __nodeLog?: (line: string) => void
      __playwrightLogs?: string[]
    }
    g.__playwrightLogs = []
    g.__nodeLog = (line: string) => {
      g.__playwrightLogs?.push(line)
    }
  })

  page.on('pageerror', (err) => {
    consolelines.push(`[pageerror] ${err.message}`)
    if (IFRAME_CRASH_RE.test(err.message)) {
      iframecrash = true
    }
  })
  page.on('console', (msg) => {
    const text = msg.text()
    const line = `[${msg.type()}] ${text}`
    consolelines.push(line)
    pagelogs.push(line)
    if (IFRAME_CRASH_RE.test(text)) {
      iframecrash = true
    }
    const perfmatch = /\[wanix-perf\] (\S+)(?: (.+))?$/.exec(text)
    if (perfmatch) {
      let extra: Record<string, unknown> | undefined
      if (perfmatch[2]) {
        try {
          extra = JSON.parse(perfmatch[2]) as Record<string, unknown>
        } catch {
          extra = { raw: perfmatch[2] }
        }
      }
      timeline.push({
        ms: Date.now() - start,
        label: perfmatch[1],
        extra,
      })
    }
  })

  const targeturl = baseurl.includes('#') ? baseurl : HASH_URL
  await page.goto(targeturl, {
    waitUntil: 'load',
    timeout: VALIDATE_TIMEOUT_MS,
  })
  record('page-loaded', { url: targeturl })

  await waitforregistersession(page, root)
  record('register-session')

  const iframecount = await page.locator('iframe[title="wanix"]').count()
  record('wanix-iframe-dom', { iframecount })
  if (iframecount < 1) {
    fail('wanix-iframe-dom', { iframecount })
  }

  // Wait until stored state has an onboard player sprite (no fixture inject).
  await polluntil(
    'player-on-board',
    VALIDATE_TIMEOUT_MS,
    EXPORT_POLL_MS,
    async () => {
      lastsnap = await readboardringsnap(page, root)
      return lastsnap
    },
    (snap) => snap.playerx != null && snap.playery != null,
  )
  record('player-on-board', { ...(lastsnap ?? {}) })

  const fixturepath = path.join(WANIX_PUBLIC_FIXTURES_DIR, 'greenring.wasm')
  await dropgreenringviawindow(page, fixturepath)
  record('greenring-drop')

  // Allow cafeapp drop handler to start async work.
  await page.waitForTimeout(500)

  if (iframecrash) {
    fail('iframe-not-loaded', {
      perftrace: collectwanixperf(consolelines, 0).map((entry) => entry.label),
      logs: await readplaywrightlogs(page),
    })
  }

  // Drop is fire-and-forget via vmloader; poll for perf marks + board ring.
  try {
    lastsnap = await polluntil(
      'board-green-ring',
      VALIDATE_TIMEOUT_MS,
      EXPORT_POLL_MS,
      async () => {
        if (iframecrash) {
          throw new Error('wanix iframe not loaded')
        }
        const logs = await readplaywrightlogs(page)
        if (logs.some((line) => IFRAME_CRASH_RE.test(line))) {
          iframecrash = true
          throw new Error('wanix iframe not loaded')
        }
        lastsnap = await readboardringsnap(page, root)
        return lastsnap
      },
      (snap) => snap.ready === true,
    )
  } catch (err) {
    const hasapplyroom = timeline.some(
      (entry) => entry.label === 'applyroom-return',
    )
    const hasspawn = timeline.some((entry) => entry.label === 'spawntask-return')
    fail('board-green-ring', {
      error: err instanceof Error ? err.message : String(err),
      iframecrash,
      hasapplyroom,
      hasspawn,
      perftrace: collectwanixperf(consolelines, 0).map((entry) => entry.label),
      logs: await readplaywrightlogs(page),
      lastsnap,
    })
  }

  if (iframecrash) {
    fail('iframe-not-loaded-late', { lastsnap })
  }

  record('pass', {
    lastsnap,
    perftrace: collectwanixperf(consolelines, 0).map((entry) => entry.label),
  })
}

export default validategreenringdrop
