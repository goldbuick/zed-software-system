import { Loro } from 'loro-crdt'

import { createFirmware } from '../firmware'
/*

What is the system docs firmware ?
docs that are used to collab edit code page content

can we use https://www.loro.dev/ instead ?

can we use a combo of snapshot / update messages ?

arrays can be nested for tuples
[a b c]
[a b c]
[a b c]

or flat with single values
a
b
c
#write source var1 var2 var3

*/

const editstate = new Loro()

export const DOCS_FIRMWARE = createFirmware(
  (chip, name) => {
    //
    return [false, undefined]
  },
  (chip, name, value) => {
    return [false, undefined]
  },
)
// .command('read', (chip, args) => {
//   const [source, maybename] = chip.mapArgs(args, ARG.STRING, ARG.STRING) as [
//     string,
//     string,
//   ]
//   switch (source.toLowerCase()) {
//     case 'codepages':
//       break
//   }
//   const name = maybename || source
//   console.info('read', { source, name })
//   return 0
// })
// .command('pop', (chip, args) => {
//   const [maybename, ...names] = args.map((arg) => chip.wordToString(arg))

//   console.info('pop', { maybename, names })

//   return 0
// })
