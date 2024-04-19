import React from 'react'
import { getgadgetstate, useSnapshot } from 'zss/device/gadgetclient'
import { Layout } from 'zss/gadget/components/layout'
import { PANEL } from 'zss/gadget/data/types'

export function Gadget() {
  const state = getgadgetstate()
  const { player, layout } = useSnapshot(state)
  return (
    <Layout player={player} layout={layout as PANEL[]} layers={state.layers} />
  )
}
