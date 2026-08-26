/// <reference types="vite/client" />

import type { MQ_BRIDGE, MQ_DEV_BRIDGE } from '../src/shared/ipc'

declare global {
  interface Window {
    mq?: MQ_BRIDGE
    mqdev?: MQ_DEV_BRIDGE
  }
}

export {}
