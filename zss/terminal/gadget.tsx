import React from 'react'
import { useGadgetState } from 'zss/device/gadgetclient'

import { Layout } from '../gadget/components/layout'

export function Gadget() {
  return <Layout {...useGadgetState()} />
}
