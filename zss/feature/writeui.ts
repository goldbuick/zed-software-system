import { DEVICELIKE, apilog, registerterminalfull } from 'zss/device/api'
import { qrlines } from 'zss/mapping/qr'

/**
 * Terminal sinks: apilog, QR, copy/open actions.
 * Layout line strings: zss/feature/zsstextui
 */

export function write(device: DEVICELIKE, player: string, text: string) {
  apilog(device, player, text)
}

export function writehyperlink(
  device: DEVICELIKE,
  player: string,
  hyperlink: string,
  label: string,
) {
  write(device, player, `!${hyperlink};${label}`)
}

/** Terminal log: `!!runit …;label` after `renderrow` — runs CLI in terminal on activate. */
export function writerunit(
  device: DEVICELIKE,
  player: string,
  command: string,
  label: string,
) {
  write(device, player, `!runit ${command};${label}`)
}

export function writeqr(device: DEVICELIKE, player: string, content: string) {
  const ascii = qrlines(content)
  for (let i = 0; i < ascii.length; i++) {
    write(device, player, ascii[i])
  }
}

export function writecopyit(
  device: DEVICELIKE,
  player: string,
  content: string,
  label: string,
  showqr = true,
) {
  if (showqr) {
    writeqr(device, player, content)
    setTimeout(() => registerterminalfull(device, player), 200)
  }
  write(device, player, `!copyit ${content};${label}`)
}

export function writeopenit(
  device: DEVICELIKE,
  player: string,
  content: string,
  label: string,
) {
  write(device, player, `!openit ${content};${label}`)
}
