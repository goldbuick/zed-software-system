import { useDeviceData } from 'zss/gadget/device'
import { resettiles, writetile } from 'zss/gadget/tiles'
import { useWriteText } from 'zss/gadget/writetext'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { ActionRow } from './actionrow'
import { ACTION_ROW_WIDTH, type TouchUIMode } from './layout'
import { TouchPlane } from './touchplane'

type ElementsProps = {
  mode: TouchUIMode
  width: number
  height: number
}

const FG = COLOR.WHITE
const BG = COLOR.DKPURPLE
const SIDEBAR_LABEL = 'sidebar'

function PortraitDock({ width, height }: { width: number; height: number }) {
  const context = useWriteText()
  resettiles(context, 32, FG, BG)
  for (let x = 0; x < width; ++x) {
    const i = x - (width - SIDEBAR_LABEL.length)
    writetile(context, width, height, x, 0, {
      char: i < 0 ? 32 : SIDEBAR_LABEL.charCodeAt(i),
      color: COLOR.WHITE,
      bg: COLOR.ONCLEAR,
    })
  }

  const mid = Math.floor(width * 0.5)
  context.x = Math.max(0, Math.floor(mid * 0.5) - 2)
  context.y = 4
  tokenizeandwritetextformat(`$ltgreyMOVE`, context, false)
  context.x = mid + Math.max(0, Math.floor(mid * 0.5) - 2)
  context.y = 4
  tokenizeandwritetextformat(`$ltgreySHOOT`, context, false)

  const actionx = Math.max(0, Math.floor((width - ACTION_ROW_WIDTH) * 0.5))

  return (
    <>
      <TouchPlane
        x={0}
        y={0}
        width={width}
        height={1}
        onPointerDown={() => {
          useDeviceData.setState((state) => ({
            ...state,
            sidebaropen: !state.sidebaropen,
          }))
        }}
      />
      <ActionRow x={actionx} y={1} />
    </>
  )
}

function LandscapeRail({
  mode,
  width,
}: {
  mode: 'landscape-rail-left' | 'landscape-rail-right'
  width: number
  height: number
}) {
  const context = useWriteText()
  resettiles(context, 32, FG, BG)
  const isleft = mode === 'landscape-rail-left'
  const label = isleft ? 'MOVE' : 'SHOOT'
  context.x = Math.max(0, Math.floor((width - label.length) * 0.5))
  context.y = 0
  tokenizeandwritetextformat(`$ltgrey${label}`, context, false)
  return null
}

function LandscapeActions({ width }: { width: number }) {
  const context = useWriteText()
  resettiles(context, 32, FG, COLOR.ONCLEAR)
  const actionx = Math.max(0, Math.floor((width - ACTION_ROW_WIDTH) * 0.5))
  return <ActionRow x={actionx} y={0} />
}

export function Elements({ mode, width, height }: ElementsProps) {
  if (mode === 'portrait-dock') {
    return <PortraitDock width={width} height={height} />
  }
  if (mode === 'landscape-actions') {
    return <LandscapeActions width={width} />
  }
  return <LandscapeRail mode={mode} width={width} height={height} />
}
