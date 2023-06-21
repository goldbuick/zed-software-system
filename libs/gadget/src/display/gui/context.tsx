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
  onSize: (width: number, height: number) => void
  children?: ReactNode
}

export function LayoutCursor({
  maxWidth,
  onSize,
  children,
}: LayoutCursorProps) {
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
          const { parentId, width, height, onSetY } = (obj?.userData ?? {}) as {
            parentId: string | undefined
            width: number | undefined
            height: number | undefined
            onSetY: ((y: number) => void) | undefined
          }
          if (parentId === parent.id) {
            const useWidth = width ?? 0
            const useHeight = height ?? 0
            if (cursorX + useWidth > maxWidth) {
              cursorX = 0
              cursorY += Math.max(1, maxHeight)
              maxHeight = 0
            }
            onSetY?.(cursorY)
            obj.position.x = cursorX * TILE_SIZE
            obj.position.y = cursorY * TILE_SIZE
            cursorX += useWidth
            maxHeight = Math.max(useHeight, maxHeight)
          }
        })

        onSize(maxWidth, cursorY + Math.max(1, maxHeight))
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
  onSetY?: (y: number) => void
}

export function MoveCursor({
  width,
  height,
  children,
  onSetY,
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
    <group
      {...props}
      userData={{ parentId: parent?.id, width, height, onSetY }}
    >
      {children}
    </group>
  )
}
