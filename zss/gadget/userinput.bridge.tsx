import { useContext, useEffect, useRef } from 'react'
import { UserInputContext } from 'zss/gadget/userinputcontext'
import type { UserInputProps } from 'zss/gadget/userinputtypes'

const USERINPUT_BRIDGE_KEYS: (keyof UserInputProps)[] = [
  'MOVE_LEFT',
  'MOVE_RIGHT',
  'MOVE_UP',
  'MOVE_DOWN',
  'SHOOT_LEFT',
  'SHOOT_RIGHT',
  'SHOOT_UP',
  'SHOOT_DOWN',
  'OK_BUTTON',
  'CANCEL_BUTTON',
  'MENU_BUTTON',
  'BUTTON_A',
  'BUTTON_B',
  'BUTTON_X',
  'BUTTON_Y',
  'BUTTON_L1',
  'BUTTON_L2',
  'BUTTON_R1',
  'BUTTON_R2',
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
    // Pad UI aliases: A confirms, B cancels when UI listens for OK/CANCEL
    // but does not wire BUTTON_A/B itself (avoids dual-queue into the game).
    const okaalias = (...args: unknown[]) => {
      if (propsref.current.BUTTON_A) {
        return
      }
      const fn = propsref.current.OK_BUTTON
      if (typeof fn === 'function') {
        ;(fn as (...args: unknown[]) => void)(...args)
      }
    }
    const cancelalias = (...args: unknown[]) => {
      if (propsref.current.BUTTON_B) {
        return
      }
      const fn = propsref.current.CANCEL_BUTTON
      if (typeof fn === 'function') {
        ;(fn as (...args: unknown[]) => void)(...args)
      }
    }
    bus.on('BUTTON_A', okaalias)
    bus.on('BUTTON_B', cancelalias)
    return () => {
      for (let i = 0; i < USERINPUT_BRIDGE_KEYS.length; ++i) {
        const key = USERINPUT_BRIDGE_KEYS[i]
        const bridge = bridges[key]
        if (bridge) {
          bus.off(key, bridge)
        }
      }
      bus.off('BUTTON_A', okaalias)
      bus.off('BUTTON_B', cancelalias)
    }
  }, [context])

  return null
}
