import { OrthographicCamera, Stats } from '@react-three/drei'
import React from 'react'
import { STATS_DEV } from 'zss/config'

import { Framing } from './Framing'
import { FX } from './FX'
import { Gadget } from './Gadget'

export function Terminal() {
  return (
    <>
      <OrthographicCamera
        makeDefault
        near={1}
        far={2000}
        position={[0, 0, 1000]}
      />
      <Framing>
        <Gadget />
      </Framing>
      <FX />
      {STATS_DEV && <Stats />}
    </>
  )
}
