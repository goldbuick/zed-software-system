import * as THREE from 'three'
import { useAsset } from 'use-asset'

import imgLoad, { updateTexture } from './load'
import { TILE_IMAGE_SIZE, TILE_PADDING } from './tiles'

export function paddedTextureFromImage(image: HTMLImageElement) {
  const COLS = Math.floor(image.width / TILE_IMAGE_SIZE)
  const ROWS = Math.floor(image.height / TILE_IMAGE_SIZE)
  const step = TILE_IMAGE_SIZE + TILE_PADDING + TILE_PADDING

  const canvas = document.createElement('canvas')
  canvas.width = COLS * step
  canvas.height = ROWS * step

  const context = canvas.getContext('2d')
  if (context) {
    for (let x = 0; x < COLS; x += 1) {
      for (let y = 0; y < ROWS; y += 1) {
        // center
        context.drawImage(
          image,
          x * TILE_IMAGE_SIZE,
          y * TILE_IMAGE_SIZE,
          TILE_IMAGE_SIZE,
          TILE_IMAGE_SIZE,
          x * step + TILE_PADDING,
          y * step + TILE_PADDING,
          TILE_IMAGE_SIZE,
          TILE_IMAGE_SIZE,
        )
        // left
        context.drawImage(
          image,
          x * TILE_IMAGE_SIZE,
          y * TILE_IMAGE_SIZE,
          1,
          TILE_IMAGE_SIZE,
          x * step,
          y * step + TILE_PADDING,
          1,
          TILE_IMAGE_SIZE,
        )
        // right
        context.drawImage(
          image,
          x * TILE_IMAGE_SIZE + TILE_IMAGE_SIZE - 1,
          y * TILE_IMAGE_SIZE,
          1,
          TILE_IMAGE_SIZE,
          x * step + step - 1,
          y * step + TILE_PADDING,
          1,
          TILE_IMAGE_SIZE,
        )
        // top
        context.drawImage(
          image,
          x * TILE_IMAGE_SIZE,
          y * TILE_IMAGE_SIZE,
          TILE_IMAGE_SIZE,
          1,
          x * step + TILE_PADDING,
          y * step,
          TILE_IMAGE_SIZE,
          1,
        )
        // bottom
        context.drawImage(
          image,
          x * TILE_IMAGE_SIZE,
          y * TILE_IMAGE_SIZE + TILE_IMAGE_SIZE - 1,
          TILE_IMAGE_SIZE,
          1,
          x * step + TILE_PADDING,
          y * step + step - 1,
          TILE_IMAGE_SIZE,
          1,
        )
      }
    }
  }

  // canvas.style.cssText = 'position: absolute; top: 0; left: 0;'
  // document.body.appendChild(canvas)

  return updateTexture(new THREE.CanvasTexture(canvas))
}

async function loadPaddedTexture(src: string) {
  const image = await imgLoad(src)
  return paddedTextureFromImage(image)
}

export default function usePaddedTexture(src: string) {
  return useAsset(loadPaddedTexture, src)
}