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

      // TODO: revisit this when we get
      // a file with a repro
      if (
        scrubbed.includes('#do') ||
        scrubbed.includes(':do') ||
        scrubbed.endsWith(' do')
      ) {
        //
      }

      return scrubbed
    })
    .join('\n')
}
