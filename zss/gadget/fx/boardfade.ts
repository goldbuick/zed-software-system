import { create } from 'zustand'

export type BOARDFADE_PHASE = 'idle' | 'out' | 'hold' | 'in'

type BOARDFADE_STATE = {
  alpha: number
  phase: BOARDFADE_PHASE
}

export const BOARDFADE_OUT_MS = 125
export const BOARDFADE_HOLD_MS = 32
export const BOARDFADE_IN_MS = 125

const BOARDFADE_STEP_MS = 16

export const useBoardFade = create<BOARDFADE_STATE>(() => ({
  alpha: 0,
  phase: 'idle',
}))

type STARTBOARDFADE_OPTIONS = {
  onoutcomplete?: () => void
}

let fadegeneration = 0
let fadetimeout = 0
/** Logout/endgame gotofade: next non-edge board change should snap grid to 0,0. */
let resetoriginpending = false

function clearfadetimer() {
  if (fadetimeout !== 0) {
    clearTimeout(fadetimeout)
    fadetimeout = 0
  }
}

function clampfadealpha(value: number): number {
  if (value <= 0) {
    return 0
  }
  if (value >= 1) {
    return 1
  }
  return value
}

function beginfadegeneration(): number {
  fadegeneration += 1
  clearfadetimer()
  return fadegeneration
}

function schedulefadestep(generation: number, step: () => void) {
  if (generation !== fadegeneration) {
    return
  }
  fadetimeout = setTimeout(step, BOARDFADE_STEP_MS) as unknown as number
}

/** Restartable dither dissolve: out to black, brief hold, in from black. */
export function startboardfade(options: STARTBOARDFADE_OPTIONS = {}) {
  const generation = beginfadegeneration()

  const onoutcomplete = options.onoutcomplete
  let outcompletefired = false
  let elapsed = 0

  useBoardFade.setState({ alpha: 0, phase: 'out' })

  function fireoutcomplete() {
    if (outcompletefired) {
      return
    }
    outcompletefired = true
    onoutcomplete?.()
  }

  function step() {
    if (generation !== fadegeneration) {
      return
    }
    elapsed += BOARDFADE_STEP_MS

    if (elapsed < BOARDFADE_OUT_MS) {
      useBoardFade.setState({
        alpha: clampfadealpha(elapsed / BOARDFADE_OUT_MS),
        phase: 'out',
      })
      schedulefadestep(generation, step)
      return
    }

    fireoutcomplete()

    if (elapsed < BOARDFADE_OUT_MS + BOARDFADE_HOLD_MS) {
      useBoardFade.setState({ alpha: 1, phase: 'hold' })
      schedulefadestep(generation, step)
      return
    }

    const inelapsed = elapsed - BOARDFADE_OUT_MS - BOARDFADE_HOLD_MS
    if (inelapsed < BOARDFADE_IN_MS) {
      useBoardFade.setState({
        alpha: clampfadealpha(1 - inelapsed / BOARDFADE_IN_MS),
        phase: 'in',
      })
      schedulefadestep(generation, step)
      return
    }

    useBoardFade.setState({ alpha: 0, phase: 'idle' })
    fadetimeout = 0
  }

  schedulefadestep(generation, step)
}

/** Dither to black and stay (alpha ends at 1). */
export function startboardfadeout() {
  const generation = beginfadegeneration()
  const startalpha = useBoardFade.getState().alpha
  let elapsed = 0
  const duration = Math.max(
    BOARDFADE_STEP_MS,
    Math.round((1 - startalpha) * BOARDFADE_OUT_MS),
  )

  useBoardFade.setState({ phase: 'out' })

  function step() {
    if (generation !== fadegeneration) {
      return
    }
    elapsed += BOARDFADE_STEP_MS
    if (elapsed < duration) {
      const t = elapsed / duration
      useBoardFade.setState({
        alpha: clampfadealpha(startalpha + (1 - startalpha) * t),
        phase: 'out',
      })
      schedulefadestep(generation, step)
      return
    }
    useBoardFade.setState({ alpha: 1, phase: 'hold' })
    fadetimeout = 0
  }

  schedulefadestep(generation, step)
}

/** Dither from black (or current alpha) to clear. Starts from 1 if already clear. */
export function startboardfadein() {
  const generation = beginfadegeneration()
  const current = useBoardFade.getState().alpha
  const startalpha = current <= 0 ? 1 : current
  let elapsed = 0
  const duration = Math.max(
    BOARDFADE_STEP_MS,
    Math.round(startalpha * BOARDFADE_IN_MS),
  )

  useBoardFade.setState({ alpha: startalpha, phase: 'in' })

  function step() {
    if (generation !== fadegeneration) {
      return
    }
    elapsed += BOARDFADE_STEP_MS
    if (elapsed < duration) {
      const t = elapsed / duration
      useBoardFade.setState({
        alpha: clampfadealpha(startalpha * (1 - t)),
        phase: 'in',
      })
      schedulefadestep(generation, step)
      return
    }
    useBoardFade.setState({ alpha: 0, phase: 'idle' })
    fadetimeout = 0
  }

  schedulefadestep(generation, step)
}

export function resetboardfade() {
  fadegeneration += 1
  clearfadetimer()
  resetoriginpending = false
  useBoardFade.setState({ alpha: 0, phase: 'idle' })
}

export function markboardfaderesetorigin() {
  resetoriginpending = true
}

export function consumeboardfaderesetorigin(): boolean {
  if (!resetoriginpending) {
    return false
  }
  resetoriginpending = false
  return true
}
