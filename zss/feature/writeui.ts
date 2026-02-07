import { DEVICELIKE, apilog, registerterminalfull } from 'zss/device/api'
import { qrlines } from 'zss/mapping/qr'

/**
 * what is writeui ?
 * this is a collection of helper function to write
 * interesting log lines to the terminal
 */

const COLOR_EDGE = '$dkpurple'

const CHR_TM = '$196'
const CHR_BM = '$205'

export const DIVIDER = '$yellow$205$205$205$196'

export function write(device: DEVICELIKE, player: string, text: string) {
  apilog(device, player, text)
}

export function writetbar(device: DEVICELIKE, player: string, width: number) {
  const CHR_TBAR = CHR_TM.repeat(width)
  write(device, player, `${COLOR_EDGE}${CHR_TBAR}`)
}

export function writebbar(device: DEVICELIKE, player: string, width: number) {
  const CHR_BBAR = CHR_BM.repeat(width)
  write(device, player, `${COLOR_EDGE}${CHR_BBAR}`)
}

export function writeheader(
  device: DEVICELIKE,
  player: string,
  header: string,
) {
  writetbar(device, player, header.length + 2)
  write(device, player, `${COLOR_EDGE} $white${header} `)
  writebbar(device, player, header.length + 2)
}

export function writesection(
  device: DEVICELIKE,
  player: string,
  section: string,
) {
  write(device, player, `${COLOR_EDGE} ${' '.repeat(section.length)} `)
  write(device, player, `${COLOR_EDGE} $gray${section} `)
  writebbar(device, player, section.length + 2)
}

export function writeoption(
  device: DEVICELIKE,
  player: string,
  option: string,
  label: string,
) {
  write(device, player, `${COLOR_EDGE} $white${option} $blue${label}`)
}

export function writetext(device: DEVICELIKE, player: string, text: string) {
  write(device, player, `${COLOR_EDGE}$blue${text}`)
}

export function writehyperlink(
  device: DEVICELIKE,
  player: string,
  hyperlink: string,
  label: string,
) {
  write(device, player, `!${hyperlink};${label}`)
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
