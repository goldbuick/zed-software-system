import React from 'react'
import { useGadgetState } from 'zss/device/gadgetclient'
import { Layout } from 'zss/gadget/components/layout'

export function Gadget() {
  return <Layout {...useGadgetState()} />
}
