/**
 * macOS dev: copy Electron.app with zed.cafe name + icon so Dock/Cmd+Tab
 * show "Zed Cafe Media Queue" instead of generic Electron.
 */
import { execFileSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
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
const bundleid = 'cafe.zed.media-queue.dev'
const appname = `${productname}.app`
const devroot = path.join(root, 'resources', 'dev')
const devapp = path.join(devroot, appname)
const stampfile = path.join(devroot, '.electron-version')
const electronapp = path.join(
  root,
  'node_modules',
  'electron',
  'dist',
  'Electron.app',
)
const iconicns = path.join(root, 'resources', 'icons', 'icon.icns')

if (process.platform !== 'darwin') {
  process.exit(0)
}

if (!existsSync(electronapp)) {
  console.error(`missing ${electronapp} -- run yarn install in ops/media-queue`)
  process.exit(1)
}

if (!existsSync(iconicns)) {
  execFileSync(binpath('tsx'), [path.join(root, 'scripts', 'stage-icon.ts')], {
    stdio: 'inherit',
    cwd: root,
  })
}

const STAMP_BRAND = '3'

const electronpkg = JSON.parse(
  readFileSync(
    path.join(root, 'node_modules', 'electron', 'package.json'),
    'utf8',
  ),
) as ELECTRON_PACKAGE

const electronversion = electronpkg.version

const stampvalue = `${electronversion}:${STAMP_BRAND}`

if (
  existsSync(stampfile) &&
  readFileSync(stampfile, 'utf8').trim() === stampvalue &&
  existsSync(devapp)
) {
  console.log(`dev app up to date: ${appname}`)
  process.exit(0)
}

rmSync(devroot, { recursive: true, force: true })
mkdirSync(devroot, { recursive: true })
execFileSync('ditto', [electronapp, devapp], { stdio: 'inherit' })

const infoplist = path.join(devapp, 'Contents', 'Info.plist')
let plist = readFileSync(infoplist, 'utf8')
plist = plist.replace(
  /<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/,
  `<key>CFBundleDisplayName</key>\n\t<string>${productname}</string>`,
)
plist = plist.replace(
  /<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>/,
  `<key>CFBundleName</key>\n\t<string>${productname}</string>`,
)
plist = plist.replace(
  /<key>CFBundleIdentifier<\/key>\s*<string>[^<]*<\/string>/,
  `<key>CFBundleIdentifier</key>\n\t<string>${bundleid}</string>`,
)
writeFileSync(infoplist, plist)

cpSync(iconicns, path.join(devapp, 'Contents', 'Resources', 'electron.icns'))

try {
  execFileSync(
    '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister',
    ['-f', devapp],
    { stdio: 'ignore' },
  )
} catch {
  // optional; dock may still refresh after quit/relaunch
}

writeFileSync(stampfile, `${stampvalue}\n`)
console.log(`staged dev app -> resources/dev/${appname}`)
