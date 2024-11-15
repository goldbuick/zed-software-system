import { useSnapshot } from 'valtio'
import { getgadgetstate } from 'zss/device/gadgetclient'
import { Layout } from 'zss/gadget/components/layout'
import { TapeConsole } from 'zss/gadget/components/tape'
import { UserFocus } from 'zss/gadget/components/userinput'

export function Gadget() {
  const state = getgadgetstate()
  const { player, layout, layers } = useSnapshot(state)

  console.info(state.layers)

  return (
    <UserFocus>
      <Layout
        key={`layout-${layers.length}`}
        player={player}
        layout={layout as any}
        layers={state.layers}
      />
      <TapeConsole key="console" />
    </UserFocus>
  )
}
