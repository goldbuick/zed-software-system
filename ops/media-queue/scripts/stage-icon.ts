/**
 * Stage zed.cafe app icons for Media Queue from cafe/favicon.ico.
 * That file is a PNG despite the .ico name. Scale with nearest-neighbor
 * so the pixel-art CRT stays chunky. No Python/Pillow -- Windows CI has neither.
 */
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import { MQ_ROOT } from './lib/paths'

type PNGIMAGE = {
  width: number
  height: number
  data: Buffer
}

type PNGCTOR = {
  new (opts: { width: number; height: number }): PNGIMAGE
  sync: {
    read: (buf: Buffer) => PNGIMAGE
    write: (png: PNGIMAGE) => Buffer
  }
}

const { PNG } = createRequire(import.meta.url)('pngjs') as { PNG: PNGCTOR }

const mqroot = MQ_ROOT
const repo = path.join(mqroot, '..', '..')
const source = path.join(repo, 'cafe', 'favicon.ico')
const iconsdir = path.join(mqroot, 'resources', 'icons')
const uidir = path.join(mqroot, 'ui')

if (!existsSync(source)) {
  console.error(`missing cafe favicon: ${source}`)
  process.exit(1)
}

mkdirSync(iconsdir, { recursive: true })

const src = PNG.sync.read(readFileSync(source))

function scalenearest(size: number): PNGIMAGE {
  const out = new PNG({ width: size, height: size })
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x * src.width) / size))
      const sy = Math.min(src.height - 1, Math.floor((y * src.height) / size))
      const si = (sy * src.width + sx) * 4
      const oi = (y * size + x) * 4
      out.data[oi] = src.data[si]
      out.data[oi + 1] = src.data[si + 1]
      out.data[oi + 2] = src.data[si + 2]
      out.data[oi + 3] = src.data[si + 3] ?? 255
    }
  }
  return out
}

function writepng(dest: string, size: number) {
  writeFileSync(dest, PNG.sync.write(scalenearest(size)))
}

const png512 = path.join(iconsdir, 'icon.png')
const png1024 = path.join(iconsdir, 'icon-1024.png')
const uipng = path.join(uidir, 'icon.png')

writepng(uipng, src.width)
writepng(png512, 512)
writepng(png1024, 1024)
console.log('staged media-queue icons from cafe/favicon.ico')

if (process.platform === 'darwin') {
  const iconset = path.join(iconsdir, 'icon.iconset')
  rmSync(iconset, { recursive: true, force: true })
  mkdirSync(iconset)
  const entries: [number, string][] = [
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
    writepng(path.join(iconset, name), size)
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
