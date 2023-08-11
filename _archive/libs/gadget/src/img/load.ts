import * as THREE from 'three'

export default function imgLoad(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function updateTexture<T extends THREE.Texture | THREE.CanvasTexture>(
  texture: T,
) {
  texture.generateMipmaps = false
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.needsUpdate = true
  return texture
}
