import { nanoid } from 'nanoid'
import React, {
  ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { TILE_SIZE } from '../../img/types'

type LayoutCursorType = {
  id: string
  maxWidth: number
  refresh: () => void
}

const LayoutCursorContext = React.createContext<Partial<LayoutCursorType>>({})

interface LayoutCursorProps {
  maxWidth: number
  children?: ReactNode
}

export function LayoutCursor({ maxWidth, children }: LayoutCursorProps) {
  const ref = useRef<THREE.Group>(null)
  const [parent] = useState(
    (): LayoutCursorType => ({
      id: nanoid(),
      maxWidth,
      refresh() {
        if (!ref.current) {
          return
        }

        let cursorX = 0
        let cursorY = 0
        let maxHeight = 0
        ref.current.traverse((obj: THREE.Object3D) => {
          const { parentId, width, height } = (obj?.userData ?? {}) as {
            parentId: string | undefined
            width: number | undefined
            height: number | undefined
          }
          if (parentId === parent.id) {
            obj.position.x = cursorX * TILE_SIZE
            obj.position.y = cursorY * TILE_SIZE
            cursorX += width ?? 0
            if (height !== undefined) {
              maxHeight = Math.max(height, maxHeight)
            }
            if (cursorX > maxWidth) {
              cursorX = 0
              cursorY += 1
            }
          }
        })
      },
    }),
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(parent.refresh, [])

  return (
    <LayoutCursorContext.Provider value={parent}>
      <group ref={ref}>{children}</group>
    </LayoutCursorContext.Provider>
  )
}

export interface MoveCursorProps {
  width: number
  height: number
  children?: ReactNode
}

export function MoveCursor({
  width,
  height,
  children,
  ...props
}: MoveCursorProps) {
  const parent = useContext(LayoutCursorContext)

  useLayoutEffect(() => {
    parent.refresh?.()
    return () => {
      if (parent.refresh) {
        setTimeout(parent.refresh, 0)
      }
    }
  }, [width, height, parent])

  return (
    <group {...props} userData={{ parentId: parent?.id, width, height }}>
      {children}
    </group>
  )
}
