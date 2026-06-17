import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  scrollsourceisrawzss,
  zedtapehtml,
  zedtaperowshtml,
  zedzsshtml,
  zsssectionlines,
} from '../../../ops/infra/zns-zedhtml.js'
import { validatecp437webchars } from '../../../ops/infra/zns-cp437.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const romdir = join(root, 'zss/rom/refscroll')
const dest = join(root, 'ops/infra/generated/zns-scroll-preview.html')

function readfixture(name) {
  return readFileSync(join(romdir, name), 'utf8').replace(/\r\n/g, '\n')
}

function assertok(condition, message) {
  if (!condition) {
    console.error(`assert failed: ${message}`)
    process.exit(1)
  }
}

const cliscroll = readfixture('cliscroll.md')
const helptext = readfixture('helptext.md')
const passage = readFileSync(
  join(root, 'ops/fixtures/lang/coolregionsbow/passage.zss'),
  'utf8',
).replace(/\r\n/g, '\n')
const clhtml = zedtapehtml(cliscroll, { tenantbase: '/' })
const helhtml = zedtapehtml(helptext, { tenantbase: '/' })
const passagehtml = zedzsshtml(passage, { tenantbase: '/' })

const clwithtitle = `@cliscroll\n${cliscroll}`
assertok(!scrollsourceisrawzss(clwithtitle), 'cliscroll with @ title is markdown not raw ZSS')
assertok(!scrollsourceisrawzss(cliscroll), 'cliscroll is markdown not raw ZSS')
assertok(!scrollsourceisrawzss(helptext), 'helptext is markdown not raw ZSS')
assertok(scrollsourceisrawzss(passage), 'passage is raw ZSS')
assertok(validatecp437webchars().length === 0, 'all cp437 0-255 must be web-safe')

assertok(clhtml.includes('OPENIT'), 'cliscroll should render OPENIT rows')
assertok(!clhtml.includes('[ZTK'), 'cliscroll should not contain raw markdown links')
assertok(!clhtml.includes('$onblue'), 'cliscroll should not show literal $onblue')
assertok(!clhtml.includes('$blwhite'), 'cliscroll should not show literal $blwhite')
assertok(
  clhtml.includes('═') || clhtml.includes('&#9552;') || clhtml.includes('$205') === false,
  'cliscroll should render box drawing from $205',
)

const hcolors = new Set([...helhtml.matchAll(/color:#[0-9a-fA-F]+/gi)].map((m) => m[0]))
assertok(hcolors.size >= 3, 'helptext should have multiple syntax colors')
assertok(!helhtml.includes('$RED'), 'helptext should not show literal $RED')
assertok(helhtml.includes('foreground color'), 'helptext fixture content present')

const passagecolors = new Set([
  ...passagehtml.matchAll(/color:#[0-9a-fA-F]+/gi),
].map((m) => m[0]))
assertok(passagecolors.size >= 3, 'passage should have ZSS syntax colors')
assertok(passagehtml.includes('@passage'), 'passage content present')
assertok(
  passagehtml.includes('color:#aa00aa'),
  'passage @ stats should be dkpurple',
)

const indexrows = [
  ...zsssectionlines('bytes'),
  '$purple$16 $yellowOPENIT $whitecoolregionsbow ',
].join('\n')
const indexhtml = `<div class="zns-tape">${zedtaperowshtml(indexrows)}</div>`
assertok(indexhtml.includes('$dkpurple') === false, 'section bar should render not leak tokens')
assertok(!indexhtml.match(/>\s*\|/), 'OPENIT rows should not have pipe prefix')
assertok(indexhtml.includes('OPENIT'), 'index-style OPENIT row present')
assertok(!indexhtml.includes('\u0010'), 'OPENIT marker must not be Unicode control U+0010')
assertok(
  indexhtml.includes('\uF010') ||
    indexhtml.includes('&#61456;') ||
    indexhtml.includes('\u25b6') ||
    indexhtml.includes('&#9654;'),
  'OPENIT row should render $16 marker from IBM font',
)
assertok(
  clhtml.includes('color:#ffffff') || clhtml.includes('color:#FFFFFF'),
  'cliscroll OPENIT label should use white',
)

mkdirSync(dirname(dest), { recursive: true })
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ZNS scroll preview</title>
<style>
body { margin: 16px; background: #0000AA; color: #fff; font-family: monospace; }
section { margin-bottom: 32px; }
</style>
</head>
<body>
<section><h1>cliscroll</h1>${clhtml}</section>
<section><h1>helptext</h1>${helhtml}</section>
<section><h1>passage</h1>${passagehtml}</section>
</body>
</html>`
writeFileSync(dest, html)
console.log(`wrote ${dest}`)
console.log(`open: file://${dest}`)
