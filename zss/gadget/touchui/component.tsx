import { useState } from 'react'

import { useScreenSize } from '../userscreen'

import { ControlSurface } from './controlsurface'
import { Keyboard } from './keyboard'

export type TouchUIProps = {
  width: number
  height: number
}

export function TouchUI({ width, height }: TouchUIProps) {
  const screensize = useScreenSize()
  const [showkeyboard, setshowkeyboard] = useState(false)

  // bail on odd states
  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  return (
    <>
      <group position={[0, 0, 800]}>
        <ControlSurface
          width={width}
          height={height}
          onToggleKeyboard={() => setshowkeyboard((state) => !state)}
        />
      </group>
      <group position={[0, 0, 900]}>
        <Keyboard
          width={width}
          height={height}
          showkeyboard={showkeyboard}
          onToggleKeyboard={() => setshowkeyboard((state) => !state)}
        />
      </group>
    </>
  )
}
