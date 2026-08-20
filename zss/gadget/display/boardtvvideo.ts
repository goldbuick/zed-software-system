import { DoubleSide, ShaderMaterial } from 'three'

/**
 * Board TV video surface.
 *
 * The CRT halftone pass multiplies every pixel by `prebright` and clamps, so a
 * flat pre-scale by the inverse stops highlights clipping but spends the same
 * reduction on shadows and midtones that were never near the clamp. This
 * applies a shoulder instead: unity slope at black, bending over so pure white
 * lands exactly on `ceiling`. Midtones keep their brightness and only the top
 * end gets compressed.
 */
const boardtvvideomaterial = new ShaderMaterial({
  transparent: false,
  side: DoubleSide,
  uniforms: {
    map: { value: null },
    /** Where pure white lands after the shoulder; 1.0 disables compression. */
    ceiling: { value: 1 },
    /** Chroma trim; tone compression flattens saturation slightly. */
    saturation: { value: 1 },
  },
  vertexShader: `
    precision highp float;
    varying vec2 vUv;

    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vUv = uv;
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform sampler2D map;
    uniform float ceiling;
    uniform float saturation;

    varying vec2 vUv;

    void main() {
      vec3 texel = texture2D(map, vUv).rgb;

      // Hyperbolic shoulder: slope 1.0 at black, asymptote placed so 1.0 -> ceiling.
      vec3 shaped = texel / (1.0 + texel * (1.0 / ceiling - 1.0));

      // Rec. 709 luma.
      float luma = dot(shaped, vec3(0.2126, 0.7152, 0.0722));
      shaped = mix(vec3(luma), shaped, saturation);

      gl_FragColor = vec4(clamp(shaped, 0.0, 1.0), 1.0);
    }
  `,
})

export function createboardtvvideomaterial() {
  return boardtvvideomaterial.clone()
}
