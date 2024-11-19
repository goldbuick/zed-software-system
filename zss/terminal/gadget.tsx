import { useEffect, useState } from 'react'
import { createdevice } from 'zss/device'
import { getgadgetstate } from 'zss/device/gadgetclient'
import { Layout } from 'zss/gadget/components/layout'
import { TapeConsole } from 'zss/gadget/components/tape'
import { UserFocus } from 'zss/gadget/components/userinput'

export function Gadget() {
  const state = getgadgetstate()
  const [inc, setInc] = useState(0)

  useEffect(() => {
    createdevice('gadgetlayout', [], (message) => {
      switch (message.target) {
        case 'layoutchange':
          setInc((state) => state + 1)
          break
      }
    })
    return () => {}
  })

  return (
    <UserFocus>
      <Layout
        key={`layout-${inc}`}
        player={state.player}
        layout={state.layout as any}
        layers={state.layers as any}
      />
      <TapeConsole key="console" />
    </UserFocus>
  )
}
