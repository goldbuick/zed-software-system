import { useCallback, useMemo } from 'react'
import { registercopy } from 'zss/device/api'
import { modemwritevaluenumber } from 'zss/device/modem'
import { useWaitForValueNumber } from 'zss/device/modemhooks'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { useHyperlinkSharedSync } from 'zss/gadget/data/usehyperlinksharedsync'
import { useMedia } from 'zss/gadget/media'
import { UserInput } from 'zss/gadget/userinput'
import { useWriteText } from 'zss/gadget/writetext'
import { range } from 'zss/mapping/array'
import { clamp } from 'zss/mapping/number'
import { inputcolor } from 'zss/screens/panel/common'
import {
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

const colormap: number[] = [...range(0, 15), ...range(33, 48)]
const bgmap: number[] = [...range(0, 15), 32]

export function TerminalColorEdit({
  active,
  prefix,
  label,
  y,
  isbg = false,
}: TapeTerminalItemInputProps & { isbg?: boolean }) {
  const context = useWriteText()
  useHyperlinkSharedSync(prefix, isbg ? 'bgedit' : 'coloredit')

  const withlist = useMemo(() => (isbg ? bgmap : colormap), [isbg])
  const address = prefix
  const value = useWaitForValueNumber(address)
  const state = value ?? 0
  const idx = useMemo(() => {
    const i = withlist.indexOf(state)
    return i >= 0 ? i : 0
  }, [withlist, state])

  const tvalue = `${state}`.padStart(2, '0')
  const tlabel = label.trim()
  const tcolor = inputcolor(!!active)
  const colorname = (COLOR[state] || COLOR[COLOR.BLACK]).toLowerCase()

  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(
    `$green$20 ${tcolor}${tlabel} $${colorname}$219$white ${tvalue} $7(←→)`,
    context,
    false,
  )

  const update = useCallback(
    (nextidx: number) => {
      const v = withlist[clamp(nextidx, 0, withlist.length - 1)]
      modemwritevaluenumber(address, v)
    },
    [withlist, address],
  )

  const left = useCallback(() => {
    update(idx - 1)
  }, [update, idx])

  const right = useCallback(() => {
    update(idx + 1)
  }, [update, idx])

  return (
    <>
      {active && (
        <UserInput
          MOVE_LEFT={left}
          MOVE_RIGHT={right}
          keydown={(event) => {
            const lkey = event.key.toLowerCase()
            switch (lkey) {
              case 'c':
                registercopy(SOFTWARE, registerreadplayer(), `${state}`)
                break
              case 'b': {
                if (state !== (COLOR.ONCLEAR as number)) {
                  const cidx =
                    state < (COLOR.ONCLEAR as number)
                      ? state
                      : state - (COLOR.BLBLACK as number)
                  const color = useMedia.getState().palettedata?.[cidx]
                  const r = Math.round((color?.r ?? 0) * 255)
                  const g = Math.round((color?.g ?? 0) * 255)
                  const b = Math.round((color?.b ?? 0) * 255)
                  const content = `@color${cidx} ${r} ${g} ${b}`
                  registercopy(SOFTWARE, registerreadplayer(), content)
                }
                break
              }
            }
          }}
        />
      )}
    </>
  )
}
