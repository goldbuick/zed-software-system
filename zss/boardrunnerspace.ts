import {
  createforward,
  shouldforwardboardrunnertoclient,
} from 'zss/device/forward'

import { createboardrunnerleafsession } from './device/boardrunner'

const { forward } = createforward((message) => {
  if (shouldforwardboardrunnertoclient()) {
    postMessage(message)
  }
})

onmessage = function handleMessage(event) {
  if (event.data?.target === 'runnerplayer') {
    createboardrunnerleafsession(event.data.player)
    return
  }
  forward(event.data)
}
