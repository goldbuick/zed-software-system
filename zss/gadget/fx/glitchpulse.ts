import { create } from 'zustand'

type GLITCHPULSE_STATE = {
  glitchactive: boolean
}

const DEFAULT_PULSE_DURATION_SEC = 0.35

export const useGlitchPulse = create<GLITCHPULSE_STATE>(() => ({
  glitchactive: false,
}))

export function setglitchpulse(durationsec = DEFAULT_PULSE_DURATION_SEC) {
  useGlitchPulse.setState({ glitchactive: true })
  setTimeout(() => {
    useGlitchPulse.setState({ glitchactive: false })
  }, durationsec * 1000)
}
