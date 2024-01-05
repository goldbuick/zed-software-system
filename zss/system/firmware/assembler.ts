import { createFirmware } from '../firmware'

export const ASSEMBLER_FIRMWARE = createFirmware(
  (chip, name) => {
    return [false, undefined]
  },
  (chip, name, value) => {
    return [false, undefined]
  },
).command('stub', (chip, words) => {
  return 0
})

/*

What is assembler firmware ?
it is one of the engine firmwares
that drives editing codepage content

zss has two types of content containers

1. code page, contains a list of key -> value entries
2. book, containes a list of code pages and config meta data

the assembler has a workspace that is a book container,
and #commands are used to view and edit the book's state

*/
