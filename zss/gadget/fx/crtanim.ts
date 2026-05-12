import { create } from 'zustand'
import { time } from 'zss/gadget/display/anim'

type CRTANIM_TARGET = {
  target: number
  start: number
  duration: number
}

type CRTANIM_STATE = {
  curveamp: CRTANIM_TARGET
  curvespeed: CRTANIM_TARGET
}

export const useCRTAnim = create<CRTANIM_STATE>(() => ({
  curveamp: { target: 0, start: 0, duration: 0 },
  curvespeed: { target: 0, start: 0, duration: 0 },
}))

export function setcrtcurveamp(target: number, duration: number) {
  useCRTAnim.setState({
    curveamp: { target, start: time.value, duration },
  })
}

export function setcrtcurvespeed(target: number, duration: number) {
  useCRTAnim.setState({
    curvespeed: { target, start: time.value, duration },
  })
}
