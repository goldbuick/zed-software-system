import { useThree } from '@react-three/fiber'

export default function useViewport() {
  const viewport = useThree((state) => state.viewport)
  return viewport.getCurrentViewport()
}
