import React from 'react'
import { Layout } from 'zss/gadget/components/layout'
import { useGadgetState } from 'zss/system/main/gadgetclient'
import { player } from 'zss/system/main/player'

export function Gadget() {
  const model = useGadgetState()
  return <Layout player={player} {...model} />
}
