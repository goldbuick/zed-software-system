import { renderUnicodeCompact } from 'uqr'
import { tape_info } from 'zss/device/api'

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

export function write(session: string, from: string, text: string) {
  tape_info(session, from, text)
}

export function writetbar(session: string, from: string, width: number) {
  const CHR_TBAR = CHR_TM.repeat(width)
  write(session, from, `${COLOR_EDGE}${CHR_TBAR}`)
}

export function writebbar(session: string, from: string, width: number) {
  const CHR_BBAR = CHR_BM.repeat(width)
  write(session, from, `${COLOR_EDGE}${CHR_BBAR}`)
}

export function writeheader(session: string, from: string, header: string) {
  write(session, from, `${COLOR_EDGE} ${' '.repeat(header.length)} `)
  writetbar(session, from, header.length + 2)
  write(session, from, `${COLOR_EDGE} $white${header} `)
  writebbar(session, from, header.length + 2)
}

export function writesection(session: string, from: string, section: string) {
  write(session, from, `${COLOR_EDGE} ${' '.repeat(section.length)} `)
  write(session, from, `${COLOR_EDGE} $gray${section} `)
  writebbar(session, from, section.length + 2)
}

export function writeoption(
  session: string,
  from: string,
  option: string,
  label: string,
) {
  write(session, from, `${COLOR_EDGE} $white${option} $blue${label}`)
}

export function writetext(session: string, from: string, text: string) {
  write(session, from, `${COLOR_EDGE}$blue${text}`)
}

export function writehyperlink(
  session: string,
  from: string,
  hyperlink: string,
  label: string,
) {
  write(session, from, `!${hyperlink};${label}`)
}

export function writecopyit(
  session: string,
  from: string,
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
    write(session, from, lineascii)
  }

  write(session, from, `!copyit ${content};${label}`)
}
