import React from 'react'
import { Layout } from 'zss/gadget/components/layout'

import { useGadgetState } from '../main/gadgetclient'
import { player } from '../main/player'

export function Gadget() {
  const model = useGadgetState()
  return <Layout player={player} {...model} />
}
