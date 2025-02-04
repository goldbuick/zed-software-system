import { useScreenSize } from '../userscreen'

import { ControlSurface } from './controlsurface'
import { Keyboard } from './keyboard'

export type TouchUIProps = {
  width: number
  height: number
}

export function TouchUI({ width, height }: TouchUIProps) {
  const screensize = useScreenSize()

  // bail on odd states
  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  return (
    <>
      <group position={[0, 0, 800]}>
        <ControlSurface width={width} height={height} />
      </group>
      <group position={[0, 0, 850]}>
        <Keyboard width={width} height={height} />
      </group>
    </>
  )
}
