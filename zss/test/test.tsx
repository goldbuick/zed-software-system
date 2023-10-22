import zsscode from 'bundle-text:./layout.txt'
import React, { useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { createWorkerHost } from '../device/workerhost'
import { Layout } from '../gadget/components/layout'

const workerhost = createWorkerHost(zsscode)

export function ComponentTest() {
  useEffect(() => {
    //
  }, [])

  // const snap = useSnapshot<Record<string, any>>(os.state(chipID, 'gadget'))

  // return <Layout panels={snap.layout} />

  return null
}
