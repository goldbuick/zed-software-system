import zsscode from 'bundle-text:./layout.txt'
import React, { useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { Layout } from '../gadget/components/layout'
import { createWorkerHost } from '../network/device/workerhost'

const workerhost = createWorkerHost('webworker:boot', zsscode)

export function ComponentTest() {
  useEffect(() => {
    //
  }, [])

  // const snap = useSnapshot<Record<string, any>>(os.state(chipID, 'gadget'))

  // return <Layout panels={snap.layout} />

  return null
}
