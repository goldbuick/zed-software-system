import { createfirmware } from 'zss/firmware'

const MODS = {
  // current target for mods
  book: '',
  board: '',
  // elements
  object: '',
  terrain: '',
  // display
  charset: '',
  palette: '',
}

type MODS_KEY = keyof typeof MODS

export const MODS_FIRMWARE = createfirmware({
  get(chip, name) {
    const lname = name.toLowerCase()

    switch (lname) {
      case 'modbook':
      case 'modboard': {
        const attr = lname.replace('mod', '') as MODS_KEY
        const id = MODS[attr]
        console.info(id)
        break
      }
    }

    return [false, undefined]
  },
  set(chip, name, value) {
    return [false, undefined]
  },
  shouldtick(chip) {
    //
  },
  tick(chip) {
    //
  },
  tock(chip) {
    //
  },
}).command('stub', (chip, words) => {
  return 0
})
