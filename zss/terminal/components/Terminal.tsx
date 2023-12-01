import { OrthographicCamera } from '@react-three/drei'
import { addEffect, addAfterEffect, useFrame } from '@react-three/fiber'
import React, { useEffect, useState } from 'react'
import Stats from 'stats.js'
import { STATS_DEV } from 'zss/config'

import { Framing } from './Framing'
import { FX } from './FX'
import { Gadget } from './Gadget'

export function Terminal() {
  const [stats] = useState(() => new Stats())

  useEffect(() => {
    if (!STATS_DEV) {
      return
    }

    document.body.appendChild(stats.dom)
    stats.showPanel(0)
    stats.dom.style.cssText = 'position:fixed;bottom:0;left:0;'
    const begin = addEffect(() => stats.begin())
    const end = addAfterEffect(() => stats.end())
    return () => {
      document.body.removeChild(stats.dom)
      begin()
      end()
    }
  }, [])

  useFrame(() => {})

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
    </>
  )
}
