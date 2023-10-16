import test_zss from 'bundle-text:./layout.txt'
import React, { useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { GadgetFirmware } from '../gadget'
import { Layout } from '../gadget/components/layout'
import { createOS } from '../os'

const os = createOS()

const chipID = os.boot(test_zss, GadgetFirmware)

export function ComponentTest() {
  useEffect(() => {
    os.tick(chipID)
  }, [])

  const snap = useSnapshot<Record<string, any>>(os.state(chipID, 'gadget'))

  return <Layout panels={snap.layout} />
}
