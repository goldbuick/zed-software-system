import { isnumber } from 'zss/mapping/types'

import { createVoiceFxConfigHandler } from './common'

export const synthvoicefxechoconfig = createVoiceFxConfigHandler(
  'echo',
  (synth) => synth.FXCHAIN.echo,
  (echo, config, value) => {
    switch (config) {
      case 'delaytime':
        if (isnumber(value)) {
          echo.set({ delayTime: value })
          return true
        }
        break
      case 'feedback':
        if (isnumber(value)) {
          echo.set({ feedback: value })
          return true
        }
        break
    }
    return false
  },
)
