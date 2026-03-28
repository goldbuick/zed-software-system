import { useContext, useEffect, useRef } from 'react'
import { UserInputContext } from 'zss/gadget/userinputcontext'
import type { UserInputProps } from 'zss/gadget/userinputtypes'

const USERINPUT_BRIDGE_KEYS: (keyof UserInputProps)[] = [
  'MOVE_LEFT',
  'MOVE_RIGHT',
  'MOVE_UP',
  'MOVE_DOWN',
  'OK_BUTTON',
  'CANCEL_BUTTON',
  'MENU_BUTTON',
  'keydown',
]

export function UserInput(events: UserInputProps) {
  const context = useContext(UserInputContext)
  const propsref = useRef(events)
  propsref.current = events

  useEffect(() => {
    const bridges: Partial<
      Record<keyof UserInputProps, (...args: any[]) => void>
    > = {}
    const bus = context as {
      on(type: string, handler: (...args: unknown[]) => void): void
      off(type: string, handler: (...args: unknown[]) => void): void
    }
    for (let i = 0; i < USERINPUT_BRIDGE_KEYS.length; ++i) {
      const key = USERINPUT_BRIDGE_KEYS[i]
      const bridge = (...args: unknown[]) => {
        const fn = propsref.current[key]
        if (typeof fn === 'function') {
          ;(fn as (...args: unknown[]) => void)(...args)
        }
      }
      bridges[key] = bridge as (...args: any[]) => void
      bus.on(key, bridge)
    }
    return () => {
      for (let i = 0; i < USERINPUT_BRIDGE_KEYS.length; ++i) {
        const key = USERINPUT_BRIDGE_KEYS[i]
        const bridge = bridges[key]
        if (bridge) {
          bus.off(key, bridge as (...args: unknown[]) => void)
        }
      }
    }
  }, [context])

  return null
}
