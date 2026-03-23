import { useCallback } from 'react'
import { registercopy } from 'zss/device/api'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { readcharfrombytes } from 'zss/feature/bytes'
import { useHyperlinkSharedSync } from 'zss/gadget/data/usehyperlinksharedsync'
import { useMedia } from 'zss/gadget/media'
import { UserInput } from 'zss/gadget/userinput'
import { useWriteText } from 'zss/gadget/writetext'
import { inputcolor } from 'zss/screens/panel/common'
import {
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

const EDIT_WIDTH = 32

export function TerminalCharEdit({
  active,
  prefix,
  label,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()
  useHyperlinkSharedSync(prefix, 'charedit')

  const address = prefix
  const value = useWaitForValueNumber(address)
  const state = value ?? 0
  const tvalue = `${state}`.padStart(3, '0')
  const tlabel = label.trim()
  const tcolor = inputcolor(!!active)

  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(
    `$green$20 ${tcolor}${tlabel} $white${tvalue} $7(←→±1 ↑↓±${EDIT_WIDTH})`,
    context,
    false,
  )

  const left = useCallback(() => {
    if (state > 0) {
      modemwritevaluenumber(address, state - 1)
    }
  }, [address, state])

  const right = useCallback(() => {
    if (state < 255) {
      modemwritevaluenumber(address, state + 1)
    }
  }, [address, state])

  const up = useCallback(() => {
    if (state >= EDIT_WIDTH) {
      modemwritevaluenumber(address, state - EDIT_WIDTH)
    }
  }, [address, state])

  const down = useCallback(() => {
    if (state <= 255 - EDIT_WIDTH) {
      modemwritevaluenumber(address, state + EDIT_WIDTH)
    }
  }, [address, state])

  return (
    <>
      {active && (
        <UserInput
          MOVE_LEFT={left}
          MOVE_RIGHT={right}
          MOVE_UP={up}
          MOVE_DOWN={down}
          keydown={(event) => {
            const lkey = event.key.toLowerCase()
            switch (lkey) {
              case 'c':
                registercopy(SOFTWARE, registerreadplayer(), `${state}`)
                break
              case 'b': {
                const { charset } = useMedia.getState()
                let content = ''
                const bits = readcharfrombytes(charset, state)
                for (let i = 0; i < bits.length; ++i) {
                  if (i % 8 === 0) {
                    content += `@char${state} `
                  }
                  content += bits[i] ? 'X' : '-'
                  if (i % 8 === 7) {
                    content += '\n'
                  }
                }
                registercopy(SOFTWARE, registerreadplayer(), content)
                break
              }
            }
          }}
        />
      )}
    </>
  )
}
