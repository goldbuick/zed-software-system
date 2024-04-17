import { createfirmware } from 'zss/firmware'

export const MEDIA_FIRMWARE = createfirmware({
  get(chip, name) {
    return [false, undefined]
  },
  set(chip, name, value) {
    return [false, undefined]
  },
  tick(chip) {
    //
  },
  tock(chip) {
    //
  },
}).command('play', (chip, words) => {
  return 0
})

/*

what is the media firmware?

this manages #play command and the kind of content it supports

*/
