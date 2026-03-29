export const starfieldVertexShader = `
attribute float aSeed;
attribute float aPulse;
attribute float aGlow;
attribute float aSize;

uniform float uTime;
uniform float uPointScale;

varying float vGlow;
varying float vAlphaBoost;

void main() {
  float twinkle = 0.7 + 0.3 * sin(uTime * 1.9 + aSeed * 21.0);
  float pulse = 0.68 + 0.32 * sin(uTime * 2.2 + aSeed * 27.0);
  float breathe = mix(1.0, pulse, aPulse);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uPointScale * aSize * twinkle * breathe * (310.0 / max(-mvPosition.z, 120.0));
  vGlow = aGlow;
  vAlphaBoost = twinkle * breathe;
}
`;

export const starfieldFragmentShader = `
uniform vec3 uColor;
uniform float uOpacity;

varying float vGlow;
varying float vAlphaBoost;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  float core = smoothstep(0.27, 0.0, d);
  float halo = exp(-d * d * 8.2);
  float alpha = clamp(core * 1.1 + halo * (0.85 + 1.05 * vGlow), 0.0, 1.0) * uOpacity * (0.78 + 0.52 * vAlphaBoost);
  gl_FragColor = vec4(uColor * (0.86 + 0.46 * vGlow), alpha);
}
`;
