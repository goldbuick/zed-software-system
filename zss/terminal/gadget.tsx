import React from 'react'
import { Layout } from '../gadget/components/layout'
import { useGadgetState } from '../system/device/gadgetmain'

export function Gadget() {
  return <Layout {...useGadgetState()} />
}
