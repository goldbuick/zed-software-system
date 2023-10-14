import test_zss from 'bundle-text:./layout.txt'
import React, { useEffect } from 'react'
import { compile, createChip } from 'zss/lang'

import { GadgetFirmware } from '../gadget'
import { Layout } from '../gadget/components/layout'

// compile script into runnable code
const build = compile(test_zss)
if (build.errors) {
  console.info(build)
  console.info(build.errors)
  console.info(build.tokens)
}

const chip = createChip(build)
GadgetFirmware.install(chip)

export function ComponentTest() {
  useEffect(() => {
    for (let i = 0; i < 10; ++i) {
      chip.tick()
    }
  }, [])

  const snap = chip.snapshot('gadget')

  return <Layout panels={snap.layout} />
}
