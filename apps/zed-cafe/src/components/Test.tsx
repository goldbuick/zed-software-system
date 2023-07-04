import { COLOR, Gadget, data } from '@zss/gadget'
import { select } from '@zss/system/mapping/array'
import { randomInteger } from '@zss/system/mapping/number'
import { setMapGridValue } from '@zss/yjs/mapping'
import { useLayoutEffect } from 'react'
import * as Y from 'yjs'

const doc = new Y.Doc()
const test = data.createGadget({})

// add to document
const gadgets = doc.getMap('gadgets')
gadgets.set(test.id, test.gadget)

const TEST_RATE = 16
const TEST_WIDTH = 60
const TEST_HEIGHT = 40

const TEST_RATE_2 = 1
const TEST_SPRITES = 128

const fade = [32, 176, 177, 178, 219]

export function Test() {
  // test code begin
  useLayoutEffect(() => {
    // create test layers
    const tileTest = data.createTL({
      width: TEST_WIDTH,
      height: TEST_HEIGHT,
      char: new Array(TEST_WIDTH * TEST_HEIGHT).fill(219).map((c, i) => {
        const chart = i - TEST_WIDTH * 5
        if (chart >= 0 && chart <= 255) {
          return chart
        }
        return c
      }),
      color: new Array(TEST_WIDTH * TEST_HEIGHT).fill(COLOR.PURPLE),
      bg: new Array(TEST_WIDTH * TEST_HEIGHT).fill(COLOR.BLACK),
    })
    data.addGL(test.gadget, tileTest.id, tileTest.layer)

    const spriteTest = data.createSL({
      sprites: new Array(TEST_SPRITES).fill(0).map((v, i) => ({
        x: randomInteger(0, TEST_WIDTH - 1),
        y: randomInteger(0, TEST_HEIGHT - 1),
        char: randomInteger(1, 15),
        color: COLOR.GREEN,
        bg: COLOR.MAGENTA,
      })),
    })
    data.addGL(test.gadget, spriteTest.id, spriteTest.layer)

    const guiTest = data.createGL({
      maxWidth: 40,
      elements: [
        { type: data.GUI_ELEMENT.EOL },
        { type: data.GUI_ELEMENT.LABEL, width: 5, label: ' rad:' },
        { type: data.GUI_ELEMENT.TEXT_EDIT, width: 14, value: 'woah' },
        { type: data.GUI_ELEMENT.BUTTON, label: 'b*oot', message: 'door:open' },
        { type: data.GUI_ELEMENT.EOL },
        { type: data.GUI_ELEMENT.LABEL, width: 5, label: ' sad:' },
        { type: data.GUI_ELEMENT.TEXT_EDIT, width: 14, value: 'alt' },
        {
          type: data.GUI_ELEMENT.BUTTON,
          label: 'd*oot',
          message: 'door:close',
        },
        { type: data.GUI_ELEMENT.EOL },
      ],
    })
    data.addGL(test.gadget, guiTest.id, guiTest.layer)

    const ditherTest = data.createDL({
      width: TEST_WIDTH,
      height: TEST_HEIGHT,
      alpha: new Array(TEST_WIDTH * TEST_HEIGHT).fill(0),
    })
    data.addGL(test.gadget, ditherTest.id, ditherTest.layer)

    let offset = 0
    const ds = 0.01
    const os = 0.0005
    const timer = setInterval(() => {
      const phase = Math.round(1 + Math.abs(Math.sin(offset * 0.001) * 14))

      // data.writeTL(tileTest.layer, ({ width, height, color, char, bg }) => {
      //   for (let i = 0; i < TEST_RATE; ++i) {
      //     const x = randomInteger(0, width - 1)
      //     const y = randomInteger(0, height - 1)
      //     const slider = Math.cos(x * ds + y * 0.25 * ds + offset * os)
      //     setMapGridValue(
      //       char,
      //       width,
      //       x,
      //       y,
      //       fade[Math.abs(Math.round(slider * (fade.length - 1)))],
      //     )
      //     if (randomInteger(0, 50) < 25) {
      //       setMapGridValue(color, width, x, y, phase + 16)
      //     } else {
      //       setMapGridValue(bg, width, x, y, COLOR.MAX - phase)
      //     }
      //   }
      // })

      // const ids = data.getSLSpriteIds(spriteTest.layer)
      // spriteTest.layer.doc?.transact(function () {
      //   for (let i = 0; i < TEST_RATE_2; ++i) {
      //     const id = select(ids)
      //     const sprite = data.getSLSprite(spriteTest.layer, id)
      //     const x = sprite?.get('x') ?? 0
      //     const y = sprite?.get('y') ?? 0
      //     data.setSLSpriteXY(
      //       sprite,
      //       randomInteger(Math.max(0, x - 1), Math.min(TEST_WIDTH - 1, x + 1)),
      //       randomInteger(Math.max(0, y - 1), Math.min(TEST_HEIGHT - 1, y + 1)),
      //     )
      //     data.setSLSpriteColor(sprite, phase)
      //     data.setSLSpriteBg(sprite, 16 - phase)
      //   }
      // })

      // if (offset % 15 === 0) {
      //   data.writeDL(ditherTest.layer, ({ width, height, alpha }) => {
      //     const alphas = [
      //       0.8, 0.75, 0.65, 0.55, 0.5, 0.45, 0.4, 0.3, 0.2, 0.2, 0.1, 0.1, 0.0,
      //       0.0, 0.0,
      //     ]
      //     const scale = 0.125
      //     const slide = 0.003
      //     const range = alphas.length - 1

      //     if (alpha) {
      //       alpha.toArray().forEach((v, i) => {
      //         const x = i % TEST_WIDTH
      //         const y = Math.floor(i / TEST_WIDTH)
      //         const dx = x - TEST_WIDTH * 0.5
      //         const dy = y - TEST_HEIGHT * 0.5
      //         const dist = Math.sqrt(dx * dx + dy * dy)
      //         const phase = Math.round(
      //           Math.abs(Math.sin(dist * scale + offset * slide)) * range,
      //         )
      //         setMapGridValue(alpha, width, x, y, alphas[phase] ?? 0)
      //       })
      //     }
      //   })
      // }

      ++offset
    }, Math.round(1000 / 15))
    return () => clearInterval(timer)
  }, [])
  // test code end

  return <Gadget gadget={test.gadget} />
}
