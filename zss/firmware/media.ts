import { createfirmware } from 'zss/firmware'

export const MEDIA_FIRMWARE = createfirmware(
  (chip, name) => {
    return [false, undefined]
  },
  (chip, name, value) => {
    return [false, undefined]
  },
).command('play', (chip, words) => {
  return 0
})

/*

what is the media firmware?

this manages #play command and the kind of content it supports

*/
