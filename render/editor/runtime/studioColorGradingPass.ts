import * as THREE from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

import type { StudioColorGradingConfig } from "../studioColorGrading";

type StudioColorGradingUniforms = {
  tDiffuse: { value: THREE.Texture | null };
  resolution: { value: THREE.Vector2 };
  contrast: { value: number };
  saturation: { value: number };
  temperature: { value: number };
  tint: { value: number };
  vignette: { value: number };
  detail: { value: number };
};

const STUDIO_COLOR_GRADING_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    contrast: { value: 0 },
    saturation: { value: 0 },
    temperature: { value: 0 },
    tint: { value: 0 },
    vignette: { value: 0 },
    detail: { value: 0 }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float contrast;
    uniform float saturation;
    uniform float temperature;
    uniform float tint;
    uniform float vignette;
    uniform float detail;
    varying vec2 vUv;

    vec3 applyDetail(vec2 uv, vec3 color) {
      vec2 texel = 1.0 / max(resolution, vec2(1.0));
      vec3 blur = texture2D(tDiffuse, uv + vec2(texel.x, 0.0)).rgb;
      blur += texture2D(tDiffuse, uv - vec2(texel.x, 0.0)).rgb;
      blur += texture2D(tDiffuse, uv + vec2(0.0, texel.y)).rgb;
      blur += texture2D(tDiffuse, uv - vec2(0.0, texel.y)).rgb;
      blur *= 0.25;

      float sharpen = max(detail, 0.0);
      float soften = max(-detail, 0.0);
      vec3 sharpened = color + (color - blur) * sharpen;
      vec3 softened = mix(color, blur, soften * 0.65);
      return mix(softened, sharpened, step(0.0, detail));
    }

    void main() {
      vec4 source = texture2D(tDiffuse, vUv);
      vec3 color = source.rgb;

      color = applyDetail(vUv, color);
      color = (color - 0.5) * (1.0 + contrast) + 0.5;

      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, 1.0 + saturation);

      color += vec3(temperature * 0.08, temperature * 0.025, -temperature * 0.08);
      color += vec3(tint * 0.045, -tint * 0.08, tint * 0.045);

      vec2 centeredUv = vUv - 0.5;
      float vignetteMask = smoothstep(0.78, 0.28, length(centeredUv));
      color *= mix(1.0 - vignette * 0.52, 1.0, vignetteMask);

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), source.a);
    }
  `
};

export function createStudioColorGradingPass(
  config: StudioColorGradingConfig
) {
  const pass = new ShaderPass(STUDIO_COLOR_GRADING_SHADER);
  updateStudioColorGradingPass(pass, config);
  return pass;
}

export function updateStudioColorGradingPass(
  pass: ShaderPass,
  config: StudioColorGradingConfig
) {
  const uniforms = pass.uniforms as StudioColorGradingUniforms;
  uniforms.contrast.value = config.contrast;
  uniforms.saturation.value = config.saturation;
  uniforms.temperature.value = config.temperature;
  uniforms.tint.value = config.tint;
  uniforms.vignette.value = config.vignette;
  uniforms.detail.value = config.detail;
}

export function setStudioColorGradingPassSize(
  pass: ShaderPass,
  width: number,
  height: number
) {
  const uniforms = pass.uniforms as StudioColorGradingUniforms;
  uniforms.resolution.value.set(Math.max(1, width), Math.max(1, height));
}
