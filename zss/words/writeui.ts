import { renderUnicodeCompact } from 'uqr'
import { DEVICELIKE, tape_info } from 'zss/device/api'

/**
 * what is writeui ?
 * this is a collection of helper function to write
 * interesting log lines to the terminal
 */

const COLOR_EDGE = '$dkpurple'

const CHR_TM = '$196'
const CHR_BM = '$205'

export function fg(color: string, text: string) {
  return `$${color}${text}$blue`
}

export function bg(color: string, text: string) {
  return `$${color}${text}$ondkblue`
}

export function write(device: DEVICELIKE, text: string) {
  tape_info(device, text)
}

export function writetbar(device: DEVICELIKE, width: number) {
  const CHR_TBAR = CHR_TM.repeat(width)
  write(device, `${COLOR_EDGE}${CHR_TBAR}`)
}

export function writebbar(device: DEVICELIKE, width: number) {
  const CHR_BBAR = CHR_BM.repeat(width)
  write(device, `${COLOR_EDGE}${CHR_BBAR}`)
}

export function writeheader(device: DEVICELIKE, header: string) {
  write(device, `${COLOR_EDGE} ${' '.repeat(header.length)} `)
  writetbar(device, header.length + 2)
  write(device, `${COLOR_EDGE} $white${header} `)
  writebbar(device, header.length + 2)
}

export function writesection(device: DEVICELIKE, section: string) {
  write(device, `${COLOR_EDGE} ${' '.repeat(section.length)} `)
  write(device, `${COLOR_EDGE} $gray${section} `)
  writebbar(device, section.length + 2)
}

export function writeoption(device: DEVICELIKE, option: string, label: string) {
  write(device, `${COLOR_EDGE} $white${option} $blue${label}`)
}

export function writetext(device: DEVICELIKE, text: string) {
  write(device, `${COLOR_EDGE}$blue${text}`)
}

export function writehyperlink(
  device: DEVICELIKE,
  hyperlink: string,
  label: string,
) {
  write(device, `!${hyperlink};${label}`)
}

export function writecopyit(
  device: DEVICELIKE,
  content: string,
  label: string,
) {
  const ascii = renderUnicodeCompact(content).split('\n')
  const rendermap: Record<number, number> = {
    [32]: 32, // space
    [9600]: 223, // top half
    [9604]: 220, // bottom half
    [9608]: 219, // full
  }

  for (let i = 0; i < ascii.length; i++) {
    const lineascii = [...ascii[i]]
      .map((c) => {
        const chr = rendermap[c.charCodeAt(0)]
        return `$${chr}`
      })
      .join('')
    write(device, lineascii)
  }

  write(device, `!copyit ${content};${label}`)
}
