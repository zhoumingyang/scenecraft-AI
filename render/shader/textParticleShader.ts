export const textParticleVertexShader = `
attribute vec3 aRandom;
attribute float aSeed;

uniform float uTime;
uniform float uPointScale;
uniform vec3 uClickPoint;
uniform float uBurstStart;
uniform float uBurstDuration;
uniform float uSpreadRatio;
uniform float uRadius;
uniform float uAmplitude;

varying vec3 vColor;
varying float vAlpha;

float easeOutCubic(float x) {
  return 1.0 - pow(1.0 - x, 3.0);
}

void main() {
  vec3 displaced = position;
  float burstTime = uTime - uBurstStart;

  if (burstTime > 0.0 && burstTime < uBurstDuration) {
    float p = clamp(burstTime / uBurstDuration, 0.0, 1.0);
    float spreadP = clamp(p / max(uSpreadRatio, 0.001), 0.0, 1.0);
    float gatherP = clamp((p - uSpreadRatio) / max(1.0 - uSpreadRatio, 0.001), 0.0, 1.0);
    float envelope = 0.0;

    if (p < uSpreadRatio) {
      envelope = easeOutCubic(spreadP);
    } else {
      envelope = 1.0 - smoothstep(0.0, 1.0, gatherP);
    }

    vec2 delta = position.xy - uClickPoint.xy;
    float dist = length(delta);
    float influence = smoothstep(uRadius, 0.0, dist);
    vec2 dir = normalize(delta + aRandom.xy * 0.55 + vec2(0.0001));
    float amp = uAmplitude * (0.72 + aSeed * 0.62);

    displaced.xy += dir * influence * amp * envelope;
    displaced.z += (aRandom.z * 34.0 + sin(aSeed * 35.0 + uTime * 12.0) * 6.0) * influence * envelope;
  }

  float twinkle = 0.72 + 0.28 * sin(uTime * 7.5 + aSeed * 40.0);
  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uPointScale * twinkle * (320.0 / max(-mvPosition.z, 120.0));

  vColor = color;
  vAlpha = 0.75 + 0.25 * twinkle;
}
`;

export const textParticleFragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  float core = smoothstep(0.26, 0.0, d);
  float halo = exp(-d * d * 11.0);
  float alpha = clamp(core * 1.05 + halo * 0.85, 0.0, 1.0) * vAlpha;

  gl_FragColor = vec4(vColor * (0.8 + halo * 0.55), alpha);
}
`;
