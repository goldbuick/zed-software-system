import React from 'react'
import { Layout } from 'zss/gadget/components/layout'
import { useGadgetState } from 'zss/system/device/gadgetmain'

export function Gadget() {
  return <Layout {...useGadgetState()} />
}
