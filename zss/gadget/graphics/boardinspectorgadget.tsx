import { InspectorComponent } from 'zss/screens/inspector/component'

type BoardInspectorGadgetProps = {
  /** World Z in board space; must clear tiles/sprites/overlays in the same parent group. */
  z: number
}

/**
 * Inspector selection + pts overlay. Mount only inside a graphics mode’s RenderTexture
 * portal (same scene/camera as the board) so pan/zoom/tilt apply and pointer UVs map correctly.
 */
export function BoardInspectorGadget({ z }: BoardInspectorGadgetProps) {
  return (
    <group position-z={z}>
      <InspectorComponent />
    </group>
  )
}
