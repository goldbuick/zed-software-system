import { tape_info } from 'zss/device/api'
import {
  mimetypeofbytesread,
  parsebinaryfile,
  parsetextfile,
  parsezipfile,
} from 'zss/firmware/loader/parsefile'
import { ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { bookreadcodepagesbytype } from './book'
import { codepagereadstats } from './codepage'
import { CODE_PAGE_TYPE } from './types'

import { MEMORY_LABEL, memoryreadbookbysoftware } from '.'

// export function memoryloader(
//   player: string,
//   file: File,
//   fileext: string,
//   binaryfile: Uint8Array,
// ) {

//   const shouldmatch = ['binaryfile', fileext]
//   tape_info('memory', 'looking for stats', ...shouldmatch)

//   const loaders = bookreadcodepagesbytype(
//     mainbook,
//     CODE_PAGE_TYPE.LOADER,
//   ).filter((codepage) => {
//     const stats = codepagereadstats(codepage)
//     const matched = Object.keys(stats).filter((name) =>
//       shouldmatch.includes(NAME(name)),
//     )
//     return matched.length === shouldmatch.length
//   })

//   for (let i = 0; i < loaders.length; ++i) {
//     const loader = loaders[i]

//     // player id + unique id fo run
//     const id = `${player}_load_${loader.id}`

//     // create binary file loader
//     MEMORY.binaryfiles.set(id, {
//       filename: file.name,
//       cursor: 0,
//       bytes: binaryfile,
//       dataview: new DataView(binaryfile.buffer),
//     })

//     // add code to active loaders
//     tape_info('memory', 'starting loader', mainbook.timestamp, id)
//     MEMORY.loaders.set(id, loader.code)
//   }
// }

// export function memoryreadbinaryfile(id: string) {
//   return MEMORY.binaryfiles.get(id)
// }

export function memoryloader(event: string, content: any, player: string) {
  // we scan main book for loaders
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const loaders = bookreadcodepagesbytype(
    mainbook,
    CODE_PAGE_TYPE.LOADER,
  ).filter((codepage) => {
    const stats = codepagereadstats(codepage)
    // check for stat being set
    return !!stats[event]
  })

  switch (event) {
    case 'chat':
      console.info(content, loaders)
      break
    case 'file':
      console.info(content, loaders)
      break
  }
}
