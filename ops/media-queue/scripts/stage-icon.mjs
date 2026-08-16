#!/usr/bin/env node
/**
 * Stage zed.cafe app icons for Media Queue from cafe/favicon.ico (64x64 PNG).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mqroot = path.join(__dirname, '..')
const repo = path.join(mqroot, '..', '..')
const source = path.join(repo, 'cafe', 'favicon.ico')
const iconsdir = path.join(mqroot, 'resources', 'icons')
const uidir = path.join(mqroot, 'ui')

if (!existsSync(source)) {
  console.error(`missing cafe favicon: ${source}`)
  process.exit(1)
}

mkdirSync(iconsdir, { recursive: true })

const png512 = path.join(iconsdir, 'icon.png')
const png1024 = path.join(iconsdir, 'icon-1024.png')
const uipng = path.join(uidir, 'icon.png')

const py = `
from PIL import Image
src = ${JSON.stringify(source)}
sizes = [
  (64, ${JSON.stringify(uipng)}),
  (512, ${JSON.stringify(png512)}),
  (1024, ${JSON.stringify(png1024)}),
]
im = Image.open(src).convert('RGBA')
for size, out in sizes:
    im.resize((size, size), Image.NEAREST).save(out)
print('staged media-queue icons from cafe/favicon.ico')
`

writeFileSync(path.join(mqroot, '.stage-icon.py'), py)
execFileSync('python3', [path.join(mqroot, '.stage-icon.py')], { stdio: 'inherit' })
rmSync(path.join(mqroot, '.stage-icon.py'), { force: true })

if (process.platform === 'darwin') {
  const iconset = path.join(iconsdir, 'icon.iconset')
  rmSync(iconset, { recursive: true, force: true })
  mkdirSync(iconset)
  const entries = [
    [16, 'icon_16x16.png'],
    [32, 'icon_16x16@2x.png'],
    [32, 'icon_32x32.png'],
    [64, 'icon_32x32@2x.png'],
    [128, 'icon_128x128.png'],
    [256, 'icon_128x128@2x.png'],
    [256, 'icon_256x256.png'],
    [512, 'icon_256x256@2x.png'],
    [512, 'icon_512x512.png'],
    [1024, 'icon_512x512@2x.png'],
  ]
  for (const [size, name] of entries) {
    execFileSync('sips', [
      '-z',
      String(size),
      String(size),
      png1024,
      '--out',
      path.join(iconset, name),
    ])
  }
  execFileSync('iconutil', [
    '-c',
    'icns',
    iconset,
    '-o',
    path.join(iconsdir, 'icon.icns'),
  ])
  rmSync(iconset, { recursive: true, force: true })
  console.log('staged resources/icons/icon.icns')
}
