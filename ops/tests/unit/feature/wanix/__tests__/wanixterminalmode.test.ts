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

  it('enters attached mode when target is registered', () => {
    registertask({ id: 'demo', label: 'demo', entrycmd: 'demo.wasm' })
    setwanixattached('task', 'demo')
    syncwanixattachedterminalmode()
    expect(useTape.getState().terminalmode).toBe('attached')
  })

  it('leaves attached mode', () => {
    registertask({ id: 'demo', label: 'demo', entrycmd: 'demo.wasm' })
    setwanixattached('task', 'demo')
    enterwanixattachedterminal()
    leavewanixattachedterminal()
    expect(useTape.getState().terminalmode).toBe('cli')
  })
})
