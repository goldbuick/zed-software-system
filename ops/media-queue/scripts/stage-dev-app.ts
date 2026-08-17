/**
 * macOS dev: brand the electron package's own dist app so Dock/Cmd+Tab
 * show "Zed Cafe Media Queue" instead of generic Electron.
 *
 * Brand in place (rename Electron.app + path.txt). A second copy under
 * resources/dev plus lsregister made Launch Services open default_app
 * with no args alongside electron-vite's real window.
 */
import { execFileSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

import { MQ_ROOT, binpath } from './lib/paths'

type ELECTRON_PACKAGE = {
  version: string
}

const root = MQ_ROOT
const productname = 'Zed Cafe Media Queue'
const appname = `${productname}.app`
const electrondir = path.join(root, 'node_modules', 'electron')
const distdir = path.join(electrondir, 'dist')
const pathfile = path.join(electrondir, 'path.txt')
const stampfile = path.join(electrondir, '.mq-dev-brand')
const stockapp = path.join(distdir, 'Electron.app')
const brandedapp = path.join(distdir, appname)
const expectedpath = `${appname}/Contents/MacOS/Electron`
const leftoverdev = path.join(root, 'resources', 'dev')
const iconicns = path.join(root, 'resources', 'icons', 'icon.icns')

if (process.platform !== 'darwin') {
  process.exit(0)
}

if (!existsSync(stockapp) && !existsSync(brandedapp)) {
  console.error(
    `missing ${stockapp} -- run yarn install in ops/media-queue`,
  )
  process.exit(1)
}

if (!existsSync(iconicns)) {
  execFileSync(binpath('tsx'), [path.join(root, 'scripts', 'stage-icon.ts')], {
    stdio: 'inherit',
    cwd: root,
  })
}

const STAMP_BRAND = '5'

const electronpkg = JSON.parse(
  readFileSync(path.join(electrondir, 'package.json'), 'utf8'),
) as ELECTRON_PACKAGE

const stampvalue = `${electronpkg.version}:${STAMP_BRAND}`
const pathcontents = existsSync(pathfile)
  ? readFileSync(pathfile, 'utf8')
  : ''

if (
  existsSync(stampfile) &&
  readFileSync(stampfile, 'utf8').trim() === stampvalue &&
  existsSync(brandedapp) &&
  !existsSync(stockapp) &&
  pathcontents === expectedpath
) {
  console.log(`dev app up to date: ${appname}`)
  process.exit(0)
}

const leftoverapp = path.join(leftoverdev, appname)
if (existsSync(leftoverapp)) {
  try {
    execFileSync(
      '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister',
      ['-u', leftoverapp],
      { stdio: 'ignore' },
    )
  } catch {
    // copy is going away either way
  }
}
rmSync(leftoverdev, { recursive: true, force: true })

if (existsSync(stockapp)) {
  if (existsSync(brandedapp)) {
    rmSync(brandedapp, { recursive: true, force: true })
  }
  renameSync(stockapp, brandedapp)
}

if (!existsSync(brandedapp)) {
  console.error(`missing branded app ${brandedapp}`)
  process.exit(1)
}

writeFileSync(pathfile, expectedpath)

const infoplist = path.join(brandedapp, 'Contents', 'Info.plist')
let plist = readFileSync(infoplist, 'utf8')
plist = plist.replace(
  /<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/,
  `<key>CFBundleDisplayName</key>\n\t<string>${productname}</string>`,
)
plist = plist.replace(
  /<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>/,
  `<key>CFBundleName</key>\n\t<string>${productname}</string>`,
)
writeFileSync(infoplist, plist)

cpSync(iconicns, path.join(brandedapp, 'Contents', 'Resources', 'electron.icns'))

writeFileSync(stampfile, `${stampvalue}\n`)
console.log(`staged dev app -> ${brandedapp}`)
