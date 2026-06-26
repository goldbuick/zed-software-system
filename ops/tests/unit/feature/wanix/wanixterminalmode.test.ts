import { useTape } from 'zss/gadget/data/zustandstores'
import {
  registertask,
  resetwanixsessionfortest,
  setwanixattached,
} from 'zss/feature/wanix/wanixsession'
import { resetwanixtermscreenfortest } from 'zss/feature/wanix/wanixtermscreen'
import {
  enterwanixattachedterminal,
  leavewanixattachedterminal,
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
    await enterwanixattachedterminal()
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
