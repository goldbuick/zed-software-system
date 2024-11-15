import { getgadgetstate } from 'zss/device/gadgetclient'
import { Layout } from 'zss/gadget/components/layout'
import { TapeConsole } from 'zss/gadget/components/tape'
import { UserFocus } from 'zss/gadget/components/userinput'

export function Gadget() {
  const state = getgadgetstate()
  return (
    <UserFocus>
      <Layout
        key={`layout-${state.layers.length}`}
        player={state.player}
        layout={state.layout as any}
        layers={state.layers as any}
      />
      <TapeConsole key="console" />
    </UserFocus>
  )
}
