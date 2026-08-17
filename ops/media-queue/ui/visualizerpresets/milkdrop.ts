import butterchurn from 'butterchurn'
import butterchurnPresets from 'butterchurn-presets'

import { MQ_CANVAS_HEIGHT, MQ_CANVAS_WIDTH } from '../tvcanvas'

import { blitvizcontrast } from './contrastblit'
import type {
  MQ_VISUALIZER_PRESET,
  MQ_VISUALIZER_PRESET_HANDLE,
  MQ_VISUALIZER_PRESET_OPTS,
} from './types'

/** Curated classic Geiss / Flexi / Martin MilkDrop presets (butterchurn-presets). */
export const MILKDROP_PRESET_NAMES = [
  '_Geiss - Artifact 01',
  '_Geiss - Desert Rose 2',
  '_Geiss - untitled',
  '_Rovastar + Geiss - Hurricane Nightmare (Posterize Mix)',
  'Aderrasi + Geiss - Airhandler (Kali Mix) - Canvas Mix',
  'Geiss - Cauldron - painterly 2 (saturation remix)',
  'Geiss - Reaction Diffusion 2',
  'Geiss - Spiral Artifact',
  'Geiss - Thumb Drum',
  'Geiss + Flexi + Martin - disconnected',
  'Flexi, martin + geiss - dedicated to the sherwin maxawow',
  'Flexi + Martin - astral projection',
  'Flexi + Martin - cascading decay swing',
  'Flexi - mindblob mix',
  'Flexi - mindblob [shiny mix]',
  'flexi - swing out on the spiral',
  'Flexi - predator-prey-spirals',
  'Flexi - infused with the spiral',
  'cope + martin - mother-of-pearl',
  'Rovastar + Loadus + Geiss - FractalDrop (Triple Mix)',
]

function pickpresetname(): string {
  const idx = Math.floor(Math.random() * MILKDROP_PRESET_NAMES.length)
  return MILKDROP_PRESET_NAMES[idx]
}

async function startmilkdrop(
  opts: MQ_VISUALIZER_PRESET_OPTS,
): Promise<MQ_VISUALIZER_PRESET_HANDLE> {
  const outcanvas = opts.canvas
  const outctx = outcanvas.getContext('2d')
  if (!outctx) {
    throw new Error('milkdrop needs 2d output canvas')
  }
  const blit = outctx

  const glcanvas = document.createElement('canvas')
  glcanvas.width = MQ_CANVAS_WIDTH
  glcanvas.height = MQ_CANVAS_HEIGHT

  const visualizer = butterchurn.createVisualizer(opts.audioctx, glcanvas, {
    width: MQ_CANVAS_WIDTH,
    height: MQ_CANVAS_HEIGHT,
  })

  visualizer.connectAudio(opts.source)
  visualizer.setRendererSize(MQ_CANVAS_WIDTH, MQ_CANVAS_HEIGHT)

  const all = butterchurnPresets.getPresets()
  const name = pickpresetname()
  const preset = all[name]
  if (!preset) {
    throw new Error('milkdrop preset missing: ' + name)
  }
  visualizer.loadPreset(preset, 0)

  let animframe: number | null = null
  let active = true

  function drawframe() {
    if (!active) {
      return
    }
    visualizer.render()
    blitvizcontrast(blit, glcanvas)
    animframe = window.requestAnimationFrame(drawframe)
  }

  drawframe()

  return {
    stop: function () {
      active = false
      if (animframe) {
        window.cancelAnimationFrame(animframe)
        animframe = null
      }
      const gl = glcanvas.getContext('webgl2') || glcanvas.getContext('webgl')
      if (gl) {
        const lose = gl.getExtension('WEBGL_lose_context')
        if (lose) {
          lose.loseContext()
        }
      }
    },
  }
}

export const milkdroppreset: MQ_VISUALIZER_PRESET = {
  id: 'milkdrop',
  start: startmilkdrop,
}
