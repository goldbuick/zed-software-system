import { useSnapshot } from 'valtio'
import { getgadgetstate } from 'zss/device/gadgetclient'
import { Layout } from 'zss/gadget/components/layout'
import { PANEL } from 'zss/gadget/data/types'

// need to defer starting worker until this component is mounted

export function Gadget() {
  const state = getgadgetstate()
  const { player, layout } = useSnapshot(state)
  return (
    <Layout player={player} layout={layout as PANEL[]} layers={state.layers} />
  )
}
