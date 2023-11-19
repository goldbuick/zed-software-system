import { ARG } from '../chip'
import { createFirmware } from '../firmware'

/*

What is the system docs firmware ?
docs that are used to collab edit code page content

can we use https://www.loro.dev/ instead ?

can we use a combo of snapshot / update messages ?

*/

export const DOCS_FIRMWARE = createFirmware('docs')
  .command('read', (state, chip, args) => {
    const [source, maybename] = chip.mapArgs(args, ARG.STRING, ARG.STRING) as [
      string,
      string,
    ]
    switch (source.toLowerCase()) {
      case 'codepages':
        break
    }
    const name = maybename || source
    console.info('read', { source, name })
    return 0
  })
  .command('pop', (state, chip, args) => {
    const [maybename, ...names] = args.map((arg) => chip.wordToString(arg))

    console.info('pop', { maybename, names })

    return 0
  })
