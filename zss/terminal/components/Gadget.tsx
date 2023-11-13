import React from 'react'
import { Layout } from 'zss/gadget/components/layout'

import { useGadgetState } from '../main/gadgetclient'
import { playerId } from '../main/playerId'

export function Gadget() {
  const model = useGadgetState()
  return <Layout playerId={playerId} {...model} />
}
