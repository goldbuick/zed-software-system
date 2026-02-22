// ZED Cafe structural keywords that don't exist in ZZT-OOP
// and would change parsing behavior if left unescaped
const ZSS_RESERVED = [
  'do',
  'done',
  'else',
  'while',
  'repeat',
  'waitfor',
  'foreach',
  'for',
  'break',
  'continue',
]

function mapkeyword(line: string, keyword: string) {
  let scrubbed = line
  const lower = scrubbed.toLowerCase()
  const kw = keyword.toLowerCase()

  // label definition at line start: :keyword
  if (lower.trim() === `:${kw}`) {
    scrubbed = scrubbed.replace(new RegExp(`:${kw}`, 'i'), `:_${kw}`)
  }

  // comment at line start: 'keyword
  if (lower.trim() === `'${kw}`) {
    scrubbed = scrubbed.replace(new RegExp(`'${kw}`, 'i'), `'_${kw}`)
  }

  // command at line start: #keyword (word boundary to avoid #for matching #fork)
  const cmdRe = new RegExp(`^(\\s*#)${kw}\\b`, 'i')
  scrubbed = scrubbed.replace(cmdRe, `$1_${kw}`)

  // inline label reference: target:keyword (word boundary)
  const inlineRe = new RegExp(`(\\S):${kw}\\b`, 'gi')
  scrubbed = scrubbed.replace(inlineRe, `$1:_${kw}`)

  // shortcut send at end of line: #send keyword
  const sendRe = new RegExp(` ${kw}$`, 'i')
  scrubbed = scrubbed.replace(sendRe, ` _${kw}`)

  return scrubbed
}

function mapcommand(line: string, command: string, mapped: string) {
  let scrubbed = line

  // command check
  if (scrubbed.trimStart().startsWith(`#${command}`)) {
    scrubbed = scrubbed.replace(`#${command}`, `#${mapped}`)
  }

  // shortcut command check
  if (
    scrubbed.trimStart().startsWith('#') &&
    scrubbed.includes(` ${command}`)
  ) {
    scrubbed = scrubbed.replace(` ${command}`, ` ${mapped}`)
  }

  return scrubbed
}

export function zztoop(content: string) {
  const lines = content.replaceAll(/\r?\n|\r/g, '\n').split('\n')
  return lines
    .map((line) => {
      // handle center lines
      let mapped = line
      if (mapped.trimStart().startsWith('$')) {
        mapped = mapped.replace('$', '$CENTER')
      }

      // handle nested center lines
      if (mapped.trimStart().startsWith('#') && mapped.includes(' $')) {
        mapped = mapped.replace(' $', ' "$CENTER') + '"'
      }

      // handle embedded chars
      let scrubbed = ''
      for (let i = 0; i < mapped.length; ++i) {
        const code = mapped.charCodeAt(i)
        if (code < 32 || code > 127) {
          scrubbed += `$${code}`
        } else {
          scrubbed += mapped[i]
        }
      }

      // normalize label definitions and references to lowercase
      // ZED Cafe labels are case-insensitive, so :TOUCH and :touch are the same
      const trimmed = scrubbed.trimStart()
      if (trimmed.startsWith(':') || trimmed.startsWith("'")) {
        scrubbed = scrubbed.toLowerCase()
      } else if (trimmed.startsWith('#')) {
        // lowercase inline label references like target:label
        scrubbed = scrubbed.replace(/:\S+/g, (m) => m.toLowerCase())
      }

      // escape all zss reserved words that could clash
      for (const kw of ZSS_RESERVED) {
        scrubbed = mapkeyword(scrubbed, kw)
      }

      // handle weave commands that map to zss
      scrubbed = mapcommand(scrubbed, 'fgplay', 'play')

      return scrubbed
    })
    .join('\n')
}
