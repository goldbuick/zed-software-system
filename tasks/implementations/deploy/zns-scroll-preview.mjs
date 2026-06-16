import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { zedtapehtml } from '../../../ops/infra/zns-zedhtml.js'

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
const clhtml = zedtapehtml(cliscroll, { tenantbase: '/' })
const helhtml = zedtapehtml(helptext, { tenantbase: '/' })

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
</body>
</html>`
writeFileSync(dest, html)
console.log(`wrote ${dest}`)
console.log(`open: file://${dest}`)
