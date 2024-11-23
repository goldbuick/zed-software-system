export const halftonefragshader = `
//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
// First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

// Other corners
  vec2 i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

// Permutations
  i = mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;

// Gradients: 41 points uniformly over a line, mapped onto a diamond.
// The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

// Normalise gradients implicitly by scaling m
// Approximation of: m *= inversesqrt( a0*a0 + h*h );
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

// Compute final noise value at P
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float aastep(float threshold, float value) {
  float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
  return smoothstep(threshold-afwidth, threshold+afwidth, value);
}
  
vec3 halftone(vec3 texcolor, vec2 st, float frequency) {
  float n = 0.1 * snoise(st * 200.0); // Fractal noise
  n += 0.05 * snoise(st * 400.0);
  n += 0.025 * snoise(st * 800.0);

  // Perform a rough RGB-to-CMYK conversion
  vec4 cmyk;
  // CMY = 1-RGB
  cmyk.xyz = 1.0 - texcolor;
  // Black generation: K = min(C,M,Y)
  cmyk.w = min(cmyk.x, min(cmyk.y, cmyk.z)); 
  // Grey component replacement: subtract K from CMY
  cmyk.xyz -= cmyk.w; 

  // K based modifier
  float flex = pow(cmyk.w, 3.11);

  // Distance to nearest point in a grid of
  // (frequency x frequency) points over the unit square
  
  float t = 0.1 + 0.1 * n + 0.11 * flex + 0.1 * cmyk.y;

  // K component: 45 degrees screen angle
  vec2 Kst = frequency * mat2(0.707, -0.707, 0.707, 0.707) * st;
  vec2 Kuv = 2.0 * fract(Kst) - 1.0; 
  float k = aastep(0.0, sqrt(cmyk.w) + t - length(Kuv) + n);
  
  // C component: 15 degrees screen angle
  vec2 Cst = frequency*mat2(0.966, -0.259, 0.259, 0.966) * st;
  vec2 Cuv = 2.0 * fract(Cst) - 1.0;
  float c = aastep(0.0, sqrt(cmyk.x) + t - length(Cuv) + n);
  
  // M component: -15 degrees screen angle
  vec2 Mst = frequency * mat2(0.966, 0.259, -0.259, 0.966) * st;
  vec2 Muv = 2.0 * fract(Mst) - 1.0;
  float m = aastep(0.0, sqrt(cmyk.y) + t - length(Muv) + n);

  // Y component: 0 degrees screen angle
  vec2 Yst = frequency * st; // 0 deg 
  vec2 Yuv = 2.0 * fract(Yst) - 1.0;
  float y = aastep(0.0, sqrt(cmyk.z) + t - length(Yuv) + n);

  // CMY screen in RGB
  vec3 black = vec3(n + 0.01);
  vec3 rgbscreen = 1.0 - vec3(c,m,y) + n;
  
  // Blend in K for final color
  vec3 factor = mix(rgbscreen, black, 1.1 * k + 0.3 * n);

  // Blend with og color
  return mix(factor, texcolor, 0.777);
}

vec3 halftone(vec3 texcolor, vec2 st) {
  return halftone(texcolor, st, 256.111);
}

`
