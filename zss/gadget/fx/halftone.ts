export const halftonefragshader = `
vec3 halftone(vec3 texcolor, vec2 st, float frequency) {
  float n = 0.1 * snoise(st * 200.0);
  n += 0.05 * snoise(st * 400.0);
  n += 0.025 * snoise(st * 800.0);

  // RGB -> CMYK with partial GCR
  const float gcr = 0.7;
  vec4 cmyk;
  cmyk.xyz = 1.0 - clamp(texcolor, 0.0, 1.0);
  cmyk.w = gcr * min(cmyk.x, min(cmyk.y, cmyk.z));
  cmyk.xyz = clamp(cmyk.xyz - cmyk.w, 0.0, 1.0);
  cmyk.w = clamp(cmyk.w, 0.0, 1.0);

  float flex = pow(cmyk.w, 3.11);
  float t = 0.1 + 0.1 * n + 0.11 * flex;

  float kd = sqrt(cmyk.w);
  float cd = sqrt(cmyk.x);
  float md = sqrt(cmyk.y);
  float yd = sqrt(cmyk.z);

  // K component: 45 degrees screen angle
  vec2 Kst = frequency * mat2(0.707, -0.707, 0.707, 0.707) * st;
  vec2 Kuv = 2.0 * fract(Kst) - 1.0;
  float k = aastep(0.0, kd + t - length(Kuv) + n);

  // C component: 15 degrees screen angle
  vec2 Cst = frequency * mat2(0.966, -0.259, 0.259, 0.966) * st;
  vec2 Cuv = 2.0 * fract(Cst) - 1.0;
  float c = aastep(0.0, cd + t - length(Cuv) + n);

  // M component: -15 degrees screen angle
  vec2 Mst = frequency * mat2(0.966, 0.259, -0.259, 0.966) * st;
  vec2 Muv = 2.0 * fract(Mst) - 1.0;
  float m = aastep(0.0, md + t - length(Muv) + n);

  // Y component: 0 degrees screen angle
  vec2 Yst = frequency * st;
  vec2 Yuv = 2.0 * fract(Yst) - 1.0;
  float y = aastep(0.0, yd + t - length(Yuv) + n);

  // Multiply-darken original color (never lerp toward paper white = wash)
  // Soft ink: dots punch holes in brightness, hue of texcolor stays
  vec3 ink = vec3(c, m, y);
  vec3 mask = vec3(1.0) - 0.18 * ink;
  mask *= 1.0 - 0.22 * clamp(k, 0.0, 1.0);
  mask = clamp(mask + n * 0.015, 0.0, 1.0);
  return texcolor * mask;
}

vec3 halftone(vec3 texcolor, vec2 st) {
  return halftone(texcolor, st, 412.321);
}
`
