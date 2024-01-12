import React from 'react'
import { Layout } from 'zss/gadget/components/layout'
import { useGadgetState } from 'zss/system/device/gadgetmain'
import { player } from 'zss/system/device/playermain'

export function Gadget() {
  const model = useGadgetState()
  return <Layout player={player} {...model} />
}
