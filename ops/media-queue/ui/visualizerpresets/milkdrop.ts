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
  '_Mig_049',
  'Aderrasi - Potion of Spirits',
  'Aderrasi - Songflower (Moss Posy)',
  'Aderrasi - Storm of the Eye (Thunder) - mash0000 - quasi pseudo meta concentrics',
  'Cope - The Neverending Explosion of Red Liquid Fire',
  'cope + martin - mother-of-pearl',
  'Eo.S. + Phat - cubetrace - v2',
  'Eo.S. + Zylot - skylight (Stained Glass Majesty mix)',
  'fiShbRaiN + Flexi - witchcraft 2.0',
  'Flexi + Martin - astral projection',
  'Flexi + Martin - cascading decay swing',
  'Flexi + stahlregen - jelly showoff parade',
  'Flexi - alien fish pond',
  'Flexi - area 51',
  'Flexi - infused with the spiral',
  'Flexi - mindblob mix',
  'Flexi - mindblob [shiny mix]',
  'Flexi - predator-prey-spirals',
  'Flexi - smashing fractals [acid etching mix]',
  'flexi + fishbrain - neon mindblob grafitti',
  'flexi - bouncing balls [double mindblob neon mix]',
  'flexi - swing out on the spiral',
  'flexi - what is the matrix',
  'Geiss - Reaction Diffusion 2',
  'Geiss - Spiral Artifact',
  'Geiss - Thumb Drum',
  'Goody - The Wild Vort',
  'Idiot - Star Of Annon',
  'Krash + Illusion - Spiral Movement',
  'Martin - acid wiring',
  'Martin - charisma',
  'Martin - liquid arrows',
  'Martin - QBikal - Surface Turbulence IIb',
  'martin - angel flight',
  'martin - another kind of groove',
  'martin - bombyx mori',
  'martin - castle in the air',
  'martin - chain breaker',
  'martin - disco mix 4',
  'martin - extreme heat',
  'martin - ghost city',
  'martin - glass corridor',
  'martin - infinity (2010 update)',
  'martin - reflections on black tiles',
  'martin - stormy sea (2010 update)',
  'martin - The Bridge of Khazad-Dum',
  'martin - witchcraft reloaded',
  'ORB - Waaa',
  'Phat+fiShbRaiN+Eo.S_Mandala_Chasers_remix',
  'Rovastar - Oozing Resistance',
  "TonyMilkdrop - Magellan's Nebula [Flexi - you enter first + multiverse]",
  'yin - 191 - Temporal singularities',
  'Zylot - Paint Spill (Music Reactive Paint Mix)',
  'Zylot - Star Ornament',
  'Zylot - True Visionary (Final Mix)',
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
