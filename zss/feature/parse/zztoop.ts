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

// Detect labels that differ only by case (e.g., :a and :A)
// and build a rename map so each variant gets a unique lowercase name.
// Standard ZZT-OOP is case-insensitive so this is rare, but some
// ZZT clones or hand-crafted content may depend on it.
function buildlabelrenamemap(lines: string[]): Map<string, string> {
  const rename = new Map<string, string>()

  // collect all label definitions grouped by lowercase form
  const groups = new Map<string, string[]>()
  for (const line of lines) {
    const trimmed = line.trimStart()
    if (trimmed.startsWith(':')) {
      const name = trimmed.slice(1).trim()
      if (!name) {
        continue
      }
      const lower = name.toLowerCase()
      let variants = groups.get(lower)
      if (!variants) {
        variants = []
        groups.set(lower, variants)
      }
      if (!variants.includes(name)) {
        variants.push(name)
      }
    }
  }

  // only process groups with actual case collisions
  for (const [lower, variants] of groups) {
    if (variants.length <= 1) {
      continue
    }
    // first variant keeps the base lowercase name
    rename.set(variants[0], lower)
    // subsequent variants get a numeric suffix
    for (let i = 1; i < variants.length; ++i) {
      rename.set(variants[i], `${lower}_${i}`)
    }
  }

  return rename
}

function applylabelrename(line: string, rename: Map<string, string>): string {
  if (rename.size === 0) {
    return line
  }
  let result = line
  const trimmed = result.trimStart()

  if (trimmed.startsWith(':')) {
    // label definition
    const name = trimmed.slice(1).trim()
    const mapped = rename.get(name)
    if (mapped !== undefined) {
      result = result.replace(`:${name}`, `:${mapped}`)
    }
  } else if (trimmed.startsWith("'")) {
    // comment (deactivated label)
    const name = trimmed.slice(1).trim()
    const mapped = rename.get(name)
    if (mapped !== undefined) {
      result = result.replace(`'${name}`, `'${mapped}`)
    }
  } else if (trimmed.startsWith('#')) {
    // command line — rename inline label refs and shortcut sends
    for (const [original, mapped] of rename) {
      // inline: target:label
      result = result.replaceAll(`:${original}`, `:${mapped}`)
      // shortcut send at end: #send label
      if (result.endsWith(` ${original}`)) {
        result = result.slice(0, result.length - original.length) + mapped
      }
    }
  }

  return result
}

export function zztoop(content: string) {
  const lines = content.replaceAll(/\r?\n|\r/g, '\n').split('\n')

  // detect case-variant label collisions and build rename map
  const rename = buildlabelrenamemap(lines)

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

      // resolve case-variant label collisions before lowercasing
      scrubbed = applylabelrename(scrubbed, rename)

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
