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
    for (let i = 0; i < USERINPUT_BRIDGE_KEYS.length; ++i) {
      const key = USERINPUT_BRIDGE_KEYS[i]
      const bridge = (...args: any[]) => {
        const fn = propsref.current[key]
        if (typeof fn === 'function') {
          fn(...args)
        }
      }
      bridges[key] = bridge
      // @ts-expect-error mitt event names match INPUT reverse enum / keydown
      context.on(key, bridge)
    }
    return () => {
      for (let i = 0; i < USERINPUT_BRIDGE_KEYS.length; ++i) {
        const key = USERINPUT_BRIDGE_KEYS[i]
        const bridge = bridges[key]
        if (bridge) {
          // @ts-expect-error mitt event names match INPUT reverse enum / keydown
          context.off(key, bridge)
        }
      }
    }
  }, [context])

  return null
}
