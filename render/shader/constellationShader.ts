export const constellationVertexShader = `
attribute float aSeed;
attribute float aPulse;

uniform float uTime;
uniform float uPointScale;

varying float vPulseWeight;
varying float vHalo;

void main() {
  float pulseSin = 0.5 + 0.5 * sin(uTime * (2.6 + aPulse * 0.55) + aSeed * 36.0);
  float pulseRange = mix(0.45, 2.1, pow(pulseSin, 1.35));
  float breathe = mix(1.0, pulseRange, clamp(aPulse, 0.0, 1.0));
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uPointScale * breathe * (300.0 / max(-mvPosition.z, 120.0));
  vPulseWeight = breathe;
  vHalo = 0.68 + 1.15 * aPulse;
}
`;

export const constellationFragmentShader = `
uniform vec3 uColor;
uniform float uOpacity;

varying float vPulseWeight;
varying float vHalo;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  float core = smoothstep(0.26, 0.0, d);
  float halo = exp(-d * d * 8.2);
  float pulseGain = 0.46 + 0.58 * vPulseWeight;
  float alpha = clamp((core * 1.1 + halo * vHalo) * pulseGain, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(uColor * (0.82 + 0.35 * vPulseWeight), alpha);
}
`;
