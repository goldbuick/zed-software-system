import Case from 'case'
import { createfirmware } from 'zss/firmware'

import { WORD_VALUE, maptostring } from '../chip'
import {
  HYPERLINK_TYPES,
  HYPERLINK_WITH_SHARED,
  findpanel,
  initstate,
  resetpanel,
} from '../gadget/data/api'
import { PANEL, PANEL_TYPE, PANEL_TYPE_MAP } from '../gadget/data/types'
import { createguid } from '../mapping/guid'

import { gadgetstate } from './gadget'

export const ZSS_FIRMWARE = createfirmware(
  (chip, name) => {
    return [false, undefined]
  },
  (chip, name, value) => {
    // we watch for sets that match the shared state
    Object.values(panelshared).forEach((state) => {
      // we care about this value
      if (state[name] !== undefined) {
        updatesharedvalue(chip.id(), name, value)
      }
    })
    return [false, undefined]
  },
)
  .command('stat', (chip, words) => {
    const parts = words.map(chip.tpi)
    chip.setName(parts.join(' '))
    return 0
  })
  .command('gadget', (chip, args) => {
    const edge = maptostring(args[0])
    const edgeConst = PANEL_TYPE_MAP[edge.toLowerCase()]
    const isScroll = edgeConst === PANEL_TYPE.SCROLL

    const arg1 = args[isScroll ? 2 : 1]
    const arg2 = args[isScroll ? 1 : 2]
    const size = chip.tpn(arg1)
    const name = maptostring(arg2)

    // get state
    const shared = gadgetstate(chip.player())
    const panelName = name || Case.capital(edge)
    const panelState: PANEL | undefined = shared.layout.find(
      (panel: PANEL) => panel.name === panelName,
    )

    if (panelState) {
      // set focus to panel and mark for reset
      shared.layoutreset = true
      shared.layoutfocus = panelName
    } else {
      switch (edgeConst) {
        case PANEL_TYPE.START:
          initstate(shared, chip.player())
          break
        case PANEL_TYPE.LEFT:
        case PANEL_TYPE.RIGHT:
        case PANEL_TYPE.TOP:
        case PANEL_TYPE.BOTTOM:
        case PANEL_TYPE.SCROLL:
          const panel: PANEL = {
            id: createguid(),
            name: panelName,
            edge: edgeConst,
            size,
            text: [],
          }
          shared.layout.push(panel)
          shared.layoutfocus = panelName
          break
        default:
          // todo: raise runtime error
          // probably make a chip api to do it
          break
      }
    }

    return 0
  })
  .command('text', (chip, args) => {
    const text = maptostring(args[0] ?? '')

    // get state
    const shared = gadgetstate(chip.player())

    // find slot
    const panel = findpanel(shared)

    // add text
    if (shared.layoutreset) {
      shared.layoutreset = false
      resetpanel(panel)
    }

    panel.text.push(text)
    return 0
  })
  .command('hyperlink', (chip, args) => {
    // get state
    const shared = gadgetstate(chip.player())

    // find slot
    const panel = findpanel(shared)

    // add hypertext
    if (shared.layoutreset) {
      shared.layoutreset = false
      resetpanel(panel)
    }

    // package into a panel item
    const [labelword, inputword, ...words] = args

    const label = maptostring(labelword)
    const input = maptostring(inputword)
    const linput = input.toLowerCase()

    const hyperlink: WORD_VALUE[] = [
      chip.id(),
      label,
      ...(HYPERLINK_TYPES.has(linput) ? [linput] : ['hypertext', input]),
      ...words,
    ]

    // type of target value to track
    const type = hyperlink[2] as string

    // do we care?
    if (HYPERLINK_WITH_SHARED.has(type)) {
      // track changes to flag
      const name = `${hyperlink[3] ?? ''}`

      // value tracking grouped by panel id
      panelshared[panel.id] = panelshared[panel.id] ?? {}

      // get current flag value
      const current = chip.get(name)

      // setup tracking if needed
      if (panelshared[panel.id][name] === undefined) {
        // this will init the value only if not already setup
        // and mark this guid as origin
        servesharedvalue(chip.id(), name, current)

        if (HYPERLINK_WITH_SHARED_TEXT.has(type)) {
          panelshared[panel.id][name] = observesharedtype<MAYBE_TEXT>(
            chip.id(),
            name,
            (value) => {
              if (value !== undefined) {
                const str = value.toJSON()
                if (str !== chip.get(name)) {
                  chip.set(name, str)
                }
              }
            },
          )
        } else {
          panelshared[panel.id][name] = observesharedvalue<MAYBE_NUMBER>(
            chip.id(),
            name,
            (value) => {
              if (value !== undefined && value !== chip.get(name)) {
                chip.set(name, value)
              }
            },
          )
        }
      }
    }

    // add content
    panel.text.push(hyperlink)
    return 0
  })
