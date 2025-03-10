export const halftonefragshader = `  
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
  return halftone(texcolor, st, 412.321);
}
`
