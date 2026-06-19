import { useTape } from 'zss/gadget/data/state'
import {
  registertask,
  resetwanixsessionfortest,
  setwanixattached,
} from 'zss/feature/wanix/wanixsession'
import { resetwanixtermscreenfortest } from 'zss/feature/wanix/wanixtermscreen'
import {
  enterwanixattachedterminal,
  leavewanixattachedterminal,
  syncwanixattachedterminalmode,
} from 'zss/feature/wanix/wanixterminalmode'

describe('wanixterminalmode', () => {
  beforeEach(() => {
    resetwanixsessionfortest()
    resetwanixtermscreenfortest()
    useTape.getState().reset()
  })

  it('enters attached mode when target is registered', async () => {
    registertask({ id: 'demo', label: 'demo', entrycmd: 'demo.wasm' })
    setwanixattached('task', 'demo')
    syncwanixattachedterminalmode()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    expect(useTape.getState().terminalmode).toBe('attached')
  })

  it('leaves attached mode', async () => {
    registertask({ id: 'demo', label: 'demo', entrycmd: 'demo.wasm' })
    setwanixattached('task', 'demo')
    await enterwanixattachedterminal()
    leavewanixattachedterminal()
    expect(useTape.getState().terminalmode).toBe('cli')
  })
})
