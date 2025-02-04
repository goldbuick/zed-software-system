import { useRef, useState } from 'react'
import { Group } from 'three'
import { RUNTIME } from 'zss/config'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { clamp, snap } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { COLOR } from 'zss/words/types'

import { ShadeBoxDither } from '../framed/dither'
import { useDeviceConfig } from '../hooks'
import { Panel } from '../panel'
import { ScrollContext } from '../panel/common'
import { Rect } from '../rect'

const KEYBOARD_SCALE = 1.5
const KEYBOARD_WIDTH = 56
const KEYBOARD_HEIGHT = 16

const LETTER_KEYS = [
  ['\n'],
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '\n', '\n'],
  [' ', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '\n', '\n'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '@', '\n', '\n'],
  [' ', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '!', '$', '\n', '\n'],
  ['Space', '#', '/', '?', ':', '"', `'`],
].flat()

function hk(hotkey: string) {
  const hktext = ` ${hotkey === '$' ? '$$' : hotkey} `
  return ['touchkey', '', 'hk', hotkey, hotkey, hktext.toLowerCase()]
}

type KeyboardProps = {
  width: number
  height: number
}

export function Keyboard({ width, height }: KeyboardProps) {
  const player = registerreadplayer()
  const { showkeyboard } = useDeviceConfig()

  const ref = useRef<Group>(null)
  const [pointers] = useState<Record<string, number>>({})

  const narrow = 16

  return (
    showkeyboard && (
      <>
        <Rect
          blocking
          width={width}
          height={height}
          visible={false}
          onPointerDown={(e) => {
            pointers[e.pointerId] = e.point.x
            if (ispresent(ref.current)) {
              ref.current.userData.x = ref.current.position.x
            }
          }}
          onPointerMove={(e) => {
            const prev = pointers[e.pointerId]
            const next = e.point.x
            if (ispresent(prev) && ref.current) {
              const drawwidth = RUNTIME.DRAW_CHAR_WIDTH() * KEYBOARD_SCALE
              const delta = Math.round(snap(next - prev, drawwidth) / drawwidth)
              ref.current.position.x = clamp(
                ref.current.userData.x + delta * drawwidth,
                KEYBOARD_WIDTH * -drawwidth + width * RUNTIME.DRAW_CHAR_WIDTH(),
                0,
              )
            }
          }}
          onPointerUp={(e) => {
            delete pointers[e.pointerId]
          }}
        />
        <ShadeBoxDither
          width={width}
          height={height}
          top={5}
          left={0}
          right={width - 1}
          bottom={height - 1}
          alpha={0.53718}
        />
        <group position={[0, 0, 1]}>
          <Rect
            visible={false}
            x={width * 0.5 - narrow * 0.5}
            y={height - 3.5}
            width={narrow}
            height={4}
            onClick={() => {
              useDeviceConfig.setState({ showkeyboard: false })
            }}
          />
        </group>
        <group ref={ref} scale={KEYBOARD_SCALE}>
          <ScrollContext.Provider
            value={{
              sendmessage(target, data) {
                // send a hyperlink message
                SOFTWARE.emit(target, data, player)
              },
              sendclose() {
                // no-op
              },
              didclose() {
                // no-op
              },
            }}
          >
            <Panel
              name="keyboard"
              inline
              color={COLOR.WHITE}
              bg={COLOR.ONCLEAR}
              width={KEYBOARD_WIDTH}
              height={KEYBOARD_HEIGHT}
              text={LETTER_KEYS.map((letter) => {
                switch (letter) {
                  case '\n':
                    return letter
                  default:
                    if (letter.startsWith(' ')) {
                      return letter
                    }
                }
                return hk(letter)
              })}
            />
          </ScrollContext.Provider>
        </group>
      </>
    )
  )
}
