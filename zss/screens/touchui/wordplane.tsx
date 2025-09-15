import { register_t9words, register_t9wordsflag } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { KEYBOARD_PRESS_DELAY, user } from 'zss/feature/keyboard'
import { useDeviceData, useWriteText } from 'zss/gadget/hooks'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { TouchPlane } from './touchplane'

type NumKeyProps = {
  x: number
  y: number
  letters: string
}

export function WordPlane({ x, y, letters }: NumKeyProps) {
  const context = useWriteText()
  const player = registerreadplayer()
  const { keyboardshift } = useDeviceData()
  const withletters = keyboardshift
    ? letters.toUpperCase()
    : letters.toLowerCase()

  context.x = x
  context.y = y
  tokenizeandwritetextformat(withletters, context, false)

  return (
    <TouchPlane
      x={x - 1}
      y={y - 1}
      width={withletters.length + 2}
      height={3}
      onPointerUp={() => {
        doasync(SOFTWARE, player, async () => {
          register_t9wordsflag(SOFTWARE, player, 'typing')
          register_t9words(SOFTWARE, player, '', [])

          const erase = useDeviceData.getState().checknumbers.length
          let typing = '{Backspace}'.repeat(erase)

          if (keyboardshift) {
            typing += '{Shift>}'
          }

          typing += withletters
            .split('')
            .map((w) => `${keyboardshift ? w.toUpperCase() : w.toLowerCase()}`)
            .join('')

          if (keyboardshift) {
            typing += '{/Shift}'
          }

          await waitfor(3)

          console.info(typing)
          await user.keyboard(typing)
          await waitfor((erase + withletters.length + 1) * KEYBOARD_PRESS_DELAY)
          register_t9wordsflag(SOFTWARE, player, '')
        })
      }}
    />
  )
}
