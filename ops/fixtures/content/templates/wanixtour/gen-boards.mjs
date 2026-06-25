#!/usr/bin/env node
/** One-shot generator for wanixtour board pages. Run from repo root. */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
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
const COLOR_MUTED = 7

function writeboard(filename, board) {
  writeFileSync(
    path.join(pagesdir, filename),
    `${JSON.stringify(board, null, 2)}\n`,
  )
}

function boardwithborder(name, code, lines, opts = {}) {
  const starty = opts.starty ?? 3
  const sparseterrain = [
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

writeboard(
  'starthere.board.json',
  boardwithborder(
    'Start Here',
    '@board Start Here\n@exitsouth concepts',
    [
      'ZED.CAFE is a fantasy terminal in your browser.',
      'Build worlds, write code, and play together.',
      'Everything runs here — no downloads, no installs.',
      '',
      'Walk SOUTH to continue.',
    ],
    { heading: 'START HERE' },
  ),
)

writeboard(
  'concepts.board.json',
  boardwithborder(
    'concepts',
    '@board concepts\n@exitnorth Start Here\n@exitsouth wanixintro',
    [
      'A BOOK is a collection of codepages.',
      'BOARDS are 60x25 rooms you walk through.',
      'TERRAIN tiles paint the floor and walls.',
      'OBJECTS move, react, and run ZSS code.',
      '',
      'Walk SOUTH for the Wanix section.',
    ],
    { heading: 'CORE CONCEPTS' },
  ),
)

writeboard(
  'wanixintro.board.json',
  boardwithborder(
    'wanixintro',
    '@board wanixintro\n@exitnorth concepts\n@exitsouth wanixsteps',
    [
      'Wanix is a browser sandbox for WASM and Linux.',
      'ZSS hosts it in a hidden iframe on the page.',
      'Terminal output mirrors to the tile screen.',
      'Type #wanix in the CLI to open the menu.',
      '',
      'Walk SOUTH for hands-on steps.',
    ],
    { heading: 'WANIX IN ZSS' },
  ),
)

writeboard(
  'wanixsteps.board.json',
  boardwithborder(
    'wanixsteps',
    '@board wanixsteps\n@exitnorth wanixintro\n@exitsouth outro',
    [
      '1. Drop a .wasm file onto the page.',
      '2. Type #wanix to open the wanix menu.',
      '3. Type #wanix vm to boot alpine linux.',
      '4. Type #wanix bind <scroll> for a scroll file.',
      '5. Type #wanix attach for tile terminal mode.',
      '',
      'Walk SOUTH to finish the tour.',
    ],
    { heading: 'TRY WANIX' },
  ),
)

writeboard(
  'outro.board.json',
  boardwithborder(
    'outro',
    '@board outro\n@exitnorth wanixsteps',
    [
      'That is the Wanix tour.',
      'See ops/fixtures/wanix for harness pages.',
      'See #wanix in the CLI for all commands.',
      '',
      'Walk NORTH to revisit any board.',
    ],
    { heading: 'END OF TOUR', starty: 4 },
  ),
)

console.log('wrote 5 wanixtour board pages')
