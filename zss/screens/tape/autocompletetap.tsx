import { useCallback } from 'react'
import { useTape } from 'zss/gadget/data/zustandstores'
import { Rect } from 'zss/gadget/rect'
import {
  type AUTO_COMPLETE,
  type AutocompleteEdge,
  layoutautocompleterows,
} from 'zss/screens/tape/autocomplete'

type AutocompleteTapTargetsProps = {
  autocomplete: AUTO_COMPLETE
  px: number
  py: number
  edge: AutocompleteEdge
  drawabove?: boolean
  /** Accept the currently highlighted suggestion. */
  onaccept: () => void
  /** Z above the enclosing Scrollable hit plane. */
  z?: number
}

/**
 * Tap inactive row to highlight; tap the active row to accept.
 */
export function AutocompleteTapTargets({
  autocomplete,
  px,
  py,
  edge,
  drawabove,
  onaccept,
  z = 3,
}: AutocompleteTapTargetsProps) {
  const autocompleteindex = useTape((state) => state.autocompleteindex)
  const hits = layoutautocompleterows(autocomplete, px, py, edge, drawabove)
  const effectiveindex = Math.max(0, autocompleteindex)

  const handletap = useCallback(
    (index: number) => {
      if (index === effectiveindex) {
        onaccept()
        return
      }
      useTape.setState({ autocompleteindex: index })
    },
    [effectiveindex, onaccept],
  )

  if (hits.length === 0) {
    return null
  }

  return (
    <>
      {hits.map((hit) => (
        <Rect
          key={`ac-tap-${hit.index}-${hit.y}`}
          visible={false}
          blocking
          cursor="pointer"
          x={hit.x}
          y={hit.y}
          z={z}
          width={hit.width}
          height={hit.height}
          onClick={() => handletap(hit.index)}
        />
      ))}
    </>
  )
}
