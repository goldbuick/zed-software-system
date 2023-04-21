import * as THREE from 'three'
import { useAsset } from 'use-asset'

import imgLoad, { updateTexture } from './load'

export function textureFromImage(image: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height

  const context = canvas.getContext('2d')
  if (context) {
    context.drawImage(image, 0, 0)
  }

  return updateTexture(new THREE.CanvasTexture(canvas))
}

async function loadTexture(src: string) {
  const image = await imgLoad(src)
  return textureFromImage(image)
}

export default function useTexture(src: string) {
  return useAsset(loadTexture, src)
}
