#!/usr/bin/env node
/** One-shot generator for wanixtour board pages. Run from repo root. */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  floordecor,
  makeboard,
  solidborder,
  textblock,
  textline,
  waterpools,
} from './boardtext.mjs'

const dir = path.dirname(fileURLToPath(import.meta.url))
const pagesdir = path.join(dir, 'pages')

const COLOR_HEADING = 14
const COLOR_BODY = 11

function writeboard(filename, board) {
  writeFileSync(
    path.join(pagesdir, filename),
    `${JSON.stringify(board, null, 2)}\n`,
  )
}

function boardwithborder(name, code, lines, opts = {}) {
  const starty = opts.starty ?? 3
  const sparseterrain = [
    ...floordecor(name, { count: opts.flooraccents ?? 28 }),
    ...waterpools(name, { count: opts.waterpools ?? 3 }),
    ...solidborder(),
    ...textblock(lines, starty, {
      x0: opts.x0 ?? 8,
      color: opts.color ?? COLOR_BODY,
      rowgap: opts.rowgap ?? 0,
    }),
  ]
  if (opts.heading) {
    sparseterrain.push(
      ...textline(opts.heading, 2, {
        x0: opts.x0 ?? 8,
        color: COLOR_HEADING,
      }),
    )
  }
  return makeboard(name, code, sparseterrain)
}

function boardchain(filename, name, prev, next, heading, lines, opts = {}) {
  const exits = []
  if (prev) {
    exits.push(`@exitnorth ${prev}`)
  }
  if (next) {
    exits.push(`@exitsouth ${next}`)
  }
  const code = `@board ${name}\n${exits.join('\n')}`
  writeboard(filename, boardwithborder(name, code, lines, { ...opts, heading }))
}

boardchain(
  'starthere.board.json',
  'Start Here',
  '',
  'concepts',
  'START HERE',
  [
    'ZED.CAFE is a fantasy terminal in your browser.',
    'Build worlds, write code, and play together.',
    'Everything runs here — no downloads, no installs.',
    '',
    'Walk SOUTH to continue.',
  ],
)

boardchain(
  'concepts.board.json',
  'concepts',
  'Start Here',
  'wanixintro',
  'CORE CONCEPTS',
  [
    'A BOOK is a collection of codepages.',
    'BOARDS are 60x25 rooms you walk through.',
    'TERRAIN tiles paint the floor and walls.',
    'OBJECTS move, react, and run ZSS code.',
    '',
    'Walk SOUTH for the Wanix section.',
  ],
)

boardchain(
  'wanixintro.board.json',
  'wanixintro',
  'concepts',
  'wanixdrop',
  'WANIX IN ZSS',
  [
    'Wanix is a browser sandbox for WASM and Linux.',
    'ZSS hosts it in a hidden iframe on the page.',
    'Terminal output mirrors to the tile screen.',
    '',
    'Walk SOUTH for step 1 of 5.',
  ],
)

boardchain(
  'wanixdrop.board.json',
  'wanixdrop',
  'wanixintro',
  'wanixmenu',
  'STEP 1 — DROP WASM',
  [
    'Build fixtures: yarn task run wanix:wasm:build',
    'Drop ops/fixtures/wanix/termbridge.wasm',
    'Tile opens when xterm cells arrive (banner text).',
    'Also try hello.wasm or hold.wasm from same folder.',
    '',
    'Walk SOUTH for the #wanix menu.',
  ],
)

boardchain(
  'wanixmenu.board.json',
  'wanixmenu',
  'wanixdrop',
  'wanixvm',
  'STEP 2 — WANIX MENU',
  [
    'Type #wanix in the CLI for the command menu.',
    'Use #wanix stop / #wanix unmount on tasks.',
    'See zss/rom/editor/commands/wanix.md for full list.',
    '',
    'Walk SOUTH to boot a Linux VM.',
  ],
)

boardchain(
  'wanixvm.board.json',
  'wanixvm',
  'wanixmenu',
  'wanixbind',
  'STEP 3 — LINUX VM',
  [
    'Type #wanix vm in the CLI (in-app hidden iframe).',
    'First boot downloads linux + v86 archives from CDN.',
    'VM serial mirrors to the tile when attached.',
    'Prep: yarn task run wanix:ensure then yarn task app dev',
    '',
    'Walk SOUTH to bind a scroll file.',
  ],
)

boardchain(
  'wanixbind.board.json',
  'wanixbind',
  'wanixvm',
  'wanixattach',
  'STEP 4 — BIND SCROLL',
  [
    'This book includes @scroll wanixnotes.',
    'Warm wanix, then type: #wanix bind wanixnotes',
    'Writes scroll-wanixnotes.txt in the active namespace.',
    'In VM serial: cat scroll-wanixnotes.txt',
    '',
    'Walk SOUTH for tile attach mode.',
  ],
)

boardchain(
  'wanixattach.board.json',
  'wanixattach',
  'wanixbind',
  'outro',
  'STEP 5 — TILE TERMINAL',
  [
    'With termbridge.wasm running, type ping — expect pong.',
    'Type #wanix attach for tile terminal mode.',
    'Type #wanix detach or Ctrl+\\ for CLI scrollback.',
    '',
    'Walk SOUTH to finish the tour.',
  ],
)

boardchain(
  'outro.board.json',
  'outro',
  'wanixattach',
  '',
  'END OF TOUR',
  [
    'Docs: ops/fixtures/wanix/README.md',
    'All #wanix commands: type #wanix in the CLI.',
    '',
    'Walk NORTH to revisit any board.',
  ],
  { starty: 4 },
)

console.log('wrote 9 wanixtour board pages')
