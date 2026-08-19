import butterchurn from 'butterchurn'
import butterchurnPresets from 'butterchurn-presets'

import { MQ_CANVAS_HEIGHT, MQ_CANVAS_WIDTH } from '../tvcanvas'

import { blitvizcontrast } from './contrastblit'
import type {
  MQ_VISUALIZER_PRESET,
  MQ_VISUALIZER_PRESET_HANDLE,
  MQ_VISUALIZER_PRESET_OPTS,
} from './types'

/** Curated mix from butterchurn-presets default (converted) pack. */
export const MILKDROP_PRESET_NAMES = [
  '_Geiss - Artifact 01',
  '_Geiss - Desert Rose 2',
  '_Geiss - untitled',
  '_Rovastar + Geiss - Hurricane Nightmare (Posterize Mix)',
  'Aderrasi + Geiss - Airhandler (Kali Mix) - Canvas Mix',
  'Aderrasi - Potion of Spirits',
  'Aderrasi - Songflower (Moss Posy)',
  'Cope - The Neverending Explosion of Red Liquid Fire',
  'cope + martin - mother-of-pearl',
  'Eo.S. + Phat - cubetrace - v2',
  'Eo.S. + Zylot - skylight (Stained Glass Majesty mix)',
  'fiShbRaiN + Flexi - witchcraft 2.0',
  'Flexi + Martin - astral projection',
  'Flexi + Martin - cascading decay swing',
  'Flexi - alien fish pond',
  'Flexi - area 51',
  'Flexi - infused with the spiral',
  'Flexi - mindblob mix',
  'Flexi - mindblob [shiny mix]',
  'Flexi - predator-prey-spirals',
  'flexi - swing out on the spiral',
  'Flexi, martin + geiss - dedicated to the sherwin maxawow',
  'Geiss + Flexi + Martin - disconnected',
  'Geiss - Cauldron - painterly 2 (saturation remix)',
  'Geiss - Reaction Diffusion 2',
  'Geiss - Spiral Artifact',
  'Geiss - Thumb Drum',
  'Goody - The Wild Vort',
  'Idiot - Star Of Annon',
  'Krash + Illusion - Spiral Movement',
  'martin - angel flight',
  'martin - castle in the air',
  'martin - ghost city',
  'martin - stormy sea (2010 update)',
  'ORB - Waaa',
  'Rovastar + Loadus + Geiss - FractalDrop (Triple Mix)',
  'Rovastar - Oozing Resistance',
  'Unchained - Rewop',
  'Unchained - Unified Drag 2',
  'Zylot - Star Ornament',
]

async function startmilkdrop(
  opts: MQ_VISUALIZER_PRESET_OPTS,
  name: string,
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
    blitvizcontrast(blit, glcanvas, opts.artwork)
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

export const MILKDROP_PRESETS: MQ_VISUALIZER_PRESET[] = []
for (let i = 0; i < MILKDROP_PRESET_NAMES.length; ++i) {
  const name = MILKDROP_PRESET_NAMES[i]
  MILKDROP_PRESETS.push({
    id: 'milkdrop:' + name,
    start: function (opts) {
      return startmilkdrop(opts, name)
    },
  })
}
