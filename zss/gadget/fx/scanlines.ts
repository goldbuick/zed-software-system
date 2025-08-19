import { EffectProps, wrapEffect } from '@react-three/postprocessing'
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Uniform } from 'three'

const scanlinefragshader = `
// CRT Emulation
// by Mattias

vec3 sample_(sampler2D tex, vec2 tc) {
	vec3 s = pow(texture2D(tex, tc).rgb, vec3(2.0));
	return s;
}

vec3 blur(sampler2D tex, vec2 tc, float offs) {
	vec4 xoffs = offs * vec4(-2.0, -1.0, 1.0, 2.0) * texelSize.x * 0.01;
	vec4 yoffs = offs * vec4(-2.0, -1.0, 1.0, 2.0) * texelSize.y * 0.001;
	
	vec3 color = vec3(0.0, 0.0, 0.0);
	color += sample_(tex, tc + vec2(xoffs.x, yoffs.x)) * 0.00366;
	color += sample_(tex, tc + vec2(xoffs.y, yoffs.x)) * 0.01465;
	color += sample_(tex, tc + vec2(    0.0, yoffs.x)) * 0.02564;
	color += sample_(tex, tc + vec2(xoffs.z, yoffs.x)) * 0.01465;
	color += sample_(tex, tc + vec2(xoffs.w, yoffs.x)) * 0.00366;
	
	color += sample_(tex, tc + vec2(xoffs.x, yoffs.y)) * 0.01465;
	color += sample_(tex, tc + vec2(xoffs.y, yoffs.y)) * 0.05861;
	color += sample_(tex, tc + vec2(    0.0, yoffs.y)) * 0.09524;
	color += sample_(tex, tc + vec2(xoffs.z, yoffs.y)) * 0.05861;
	color += sample_(tex, tc + vec2(xoffs.w, yoffs.y)) * 0.01465;
	
	color += sample_(tex, tc + vec2(xoffs.x, 0.0)) * 0.02564;
	color += sample_(tex, tc + vec2(xoffs.y, 0.0)) * 0.09524;
	color += sample_(tex, tc + vec2(    0.0, 0.0)) * 0.15018;
	color += sample_(tex, tc + vec2(xoffs.z, 0.0)) * 0.09524;
	color += sample_(tex, tc + vec2(xoffs.w, 0.0)) * 0.02564;
	
	color += sample_(tex, tc + vec2(xoffs.x, yoffs.z)) * 0.01465;
	color += sample_(tex, tc + vec2(xoffs.y, yoffs.z)) * 0.05861;
	color += sample_(tex, tc + vec2(    0.0, yoffs.z)) * 0.09524;
	color += sample_(tex, tc + vec2(xoffs.z, yoffs.z)) * 0.05861;
	color += sample_(tex, tc + vec2(xoffs.w, yoffs.z)) * 0.01465;
	
	color += sample_(tex, tc + vec2(xoffs.x, yoffs.w)) * 0.00366;
	color += sample_(tex, tc + vec2(xoffs.y, yoffs.w)) * 0.01465;
	color += sample_(tex, tc + vec2(    0.0, yoffs.w)) * 0.02564;
	color += sample_(tex, tc + vec2(xoffs.z, yoffs.w)) * 0.01465;
	color += sample_(tex, tc + vec2(xoffs.w, yoffs.w)) * 0.00366;

	return color;
}

float rand(vec2 co) {
  float a = 12.9898;
  float b = 78.233;
  float c = 43758.5453;
  float dt = dot(co.xy, vec2(a, b));
  float sn = mod(dt, 3.14);
  return fract(sin(sn) * c);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 col;  
  col.r = 1.0 * blur(inputBuffer, vec2(uv.x + 0.0009, uv.y + 0.0009), 1.2).x + 0.005;
  col.g = 1.0 * blur(inputBuffer, vec2(uv.x + 0.000, uv.y - 0.0015), 1.2).y + 0.005;
  col.b = 1.0 * blur(inputBuffer, vec2(uv.x - 0.0015, uv.y + 0.000), 1.2).z + 0.005;  

  col.r += 0.2 * blur(inputBuffer, vec2(uv.x + 0.0009, uv.y + 0.0009), 2.25).x - 0.005;
  col.g += 0.2 * blur(inputBuffer, vec2(uv.x + 0.000, uv.y - 0.0015), 1.75).y - 0.005;
  col.b += 0.2 * blur(inputBuffer, vec2(uv.x - 0.0015, uv.y + 0.000), 1.25).z - 0.005;
  
  float ghs = 0.05;
	col.r += ghs * (1.0 - 0.299) * blur(inputBuffer, 0.75 * vec2(0.01, -0.027) + vec2(uv.x + 0.001, uv.y + 0.001), 7.0).x;
  col.g += ghs * (1.0 - 0.587) * blur(inputBuffer, 0.75 * vec2(-0.022, -0.02) + vec2(uv.x + 0.000, uv.y - 0.002), 5.0).y;
  col.b += ghs * (1.0 - 0.114) * blur(inputBuffer, 0.75 * vec2(-0.02, -0.0) + vec2(uv.x - 0.002, uv.y + 0.000), 3.0).z;

  col = clamp(col * 0.4 + 0.6 * col * 1.0, 0.0, 1.0);
	col = mix(col, col * col * col * col * col * col, 0.5) * 3.8;

	float scans = clamp(0.35 + 0.15 * sin(3.5 * (time * 0.125) + uv.y * resolution.y * 1.5), 0.0, 1.0);
	float s = pow(scans, 0.999);
	col = col * vec3(s);

  col *= 1.0 + 0.0015 * sin(500.0 * time);
  col *= 1.0 - 0.15 * vec3(clamp((mod(uv.x * texelSize.x, 2.0) - 1.0) * 2.0, 0.0, 1.0));
	
  col *= vec3(1.0) - 0.25 * vec3(
   rand(uv + 0.0001 * time), 
   rand(uv + 0.0001 * time + 0.3), 
   rand(uv + 0.0001 * time + 0.5));
	col = pow(col, vec3(0.45));

  outputColor = vec4(col.rgb, 1.0);
}
`

class ScanlinesEffect extends Effect {
  constructor() {
    super('ScanlinesEffect', scanlinefragshader, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      defines: new Map([]),
      uniforms: new Map<string, Uniform>([]),
    })
  }

  update(): void {}
}

export type ScanlinesProps = EffectProps<typeof ScanlinesEffect>

export const Scanlines = wrapEffect(ScanlinesEffect)
