import { MQ_CANVAS_HEIGHT, MQ_CANVAS_WIDTH } from '../tvcanvas'

import type {
  MQ_VISUALIZER_PRESET,
  MQ_VISUALIZER_PRESET_HANDLE,
  MQ_VISUALIZER_PRESET_OPTS,
} from './types'
import {
  VIZ_BAR_COUNT,
  VIZ_BG,
  drawartwork,
  drawmirroredbars,
  drawscanlines,
  drawscopeline,
} from './vizshared'

function startclassicbars(
  opts: MQ_VISUALIZER_PRESET_OPTS,
): MQ_VISUALIZER_PRESET_HANDLE {
  const canvas = opts.canvas
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('classicbars needs 2d canvas')
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
      top: 12,
      bottom: Math.floor(MQ_CANVAS_HEIGHT * 0.62),
    })
    drawscopeline(draw, opts.analyser, opts.timedata, {
      top: Math.floor(MQ_CANVAS_HEIGHT * 0.68),
      height: MQ_CANVAS_HEIGHT - Math.floor(MQ_CANVAS_HEIGHT * 0.68) - 12,
      lineWidth: 2,
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

export const classicbarspreset: MQ_VISUALIZER_PRESET = {
  id: 'classicbars',
  start: startclassicbars,
}
