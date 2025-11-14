function mapkeyword(line: string, keyword: string) {
  let scrubbed = line

  // label check
  if (scrubbed.startsWith(`:${keyword}`)) {
    scrubbed = scrubbed.replace(`:${keyword}`, `:_${keyword}`)
  }

  // comment check
  if (scrubbed.trim() === `'${keyword}`) {
    scrubbed = scrubbed.replace(`'${keyword}`, `'_${keyword}`)
  }

  // send check
  if (scrubbed.startsWith(`#${keyword}`)) {
    scrubbed = scrubbed.replace(`#${keyword}`, `#_${keyword}`)
  }

  // shortcut send check
  if (scrubbed.endsWith(` ${keyword}`)) {
    scrubbed = scrubbed.replace(` ${keyword}`, ` _${keyword}`)
  }

  // result
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

      // handle zss reserved words being used for labels
      scrubbed = mapkeyword(scrubbed, 'do')
      scrubbed = mapkeyword(scrubbed, 'done')

      // handle weave commands that map to zss
      scrubbed = mapcommand(scrubbed, 'fgplay', 'play')

      if (scrubbed.includes('do') || scrubbed.includes('done')) {
        console.info('>>>', scrubbed)
      }

      return scrubbed
    })
    .join('\n')
}
