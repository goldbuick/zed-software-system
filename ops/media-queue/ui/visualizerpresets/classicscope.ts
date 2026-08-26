import { MQ_CANVAS_HEIGHT, MQ_CANVAS_WIDTH } from '../tvcanvas'

import {
  VIZ_BAR_COUNT,
  VIZ_BG,
  drawartwork,
  drawmirroredbars,
  drawscanlines,
  drawscopeline,
} from './vizshared'
import type {
  MQ_VISUALIZER_PRESET,
  MQ_VISUALIZER_PRESET_HANDLE,
  MQ_VISUALIZER_PRESET_OPTS,
} from './types'

function startclassicscope(
  opts: MQ_VISUALIZER_PRESET_OPTS,
): MQ_VISUALIZER_PRESET_HANDLE {
  const canvas = opts.canvas
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('classicscope needs 2d canvas')
  }
  const draw = ctx
  const peaks = new Array(VIZ_BAR_COUNT).fill(0)
  const decay = new Array(VIZ_BAR_COUNT).fill(0)
  let animframe: number | null = null
  let active = true

  function drawframe() {
    if (!active) {
      return
    }
    draw.fillStyle = VIZ_BG
    draw.fillRect(0, 0, MQ_CANVAS_WIDTH, MQ_CANVAS_HEIGHT)
    if (opts.artwork) {
      drawartwork(draw, opts.artwork)
    }
    drawscanlines(draw)
    drawmirroredbars(draw, opts.analyser, opts.freqdata, peaks, decay, {
      top: 8,
      bottom: Math.floor(MQ_CANVAS_HEIGHT * 0.22),
    })
    drawscopeline(draw, opts.analyser, opts.timedata, {
      top: Math.floor(MQ_CANVAS_HEIGHT * 0.24),
      height: Math.floor(MQ_CANVAS_HEIGHT * 0.7),
      lineWidth: 3,
    })
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
    },
  }
}

export const classicscopepreset: MQ_VISUALIZER_PRESET = {
  id: 'classicscope',
  start: startclassicscope,
}
