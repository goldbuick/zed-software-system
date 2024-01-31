import { createfirmware } from 'zss/system/firmware'

export const ASSEMBLER_FIRMWARE = createfirmware(
  (chip, name) => {
    switch (name) {
      case 'books':
        // books is the entrypoint we can read from
        // everything else is punching down nested data
        break
    }
    return [false, undefined]
  },
  (chip, name, value) => {
    return [false, undefined]
  },
).command('open', (chip, words) => {
  // open a book or page ?
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

we want to open a book
we want to open a page

we want to edit an entry ?

*/
