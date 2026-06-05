import * as THREE from "three";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { DotScreenPass } from "three/examples/jsm/postprocessing/DotScreenPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass.js";
import { GlitchPass } from "three/examples/jsm/postprocessing/GlitchPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { HalftonePass } from "three/examples/jsm/postprocessing/HalftonePass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { RenderPixelatedPass } from "three/examples/jsm/postprocessing/RenderPixelatedPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { SSRPass } from "three/examples/jsm/postprocessing/SSRPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import type { EditorPostProcessPassId, ResolvedEditorPostProcessingConfigJSON } from "../core/types";
import type { createStudioColorGradingPass } from "./studioColorGradingPass";

export type EditorRuntimePostProcessingPassRefs = {
  afterimagePass: AfterimagePass | null;
  bokehPass: BokehPass | null;
  dotScreenPass: DotScreenPass | null;
  filmPass: FilmPass | null;
  glitchPass: GlitchPass | null;
  gtaoPass: GTAOPass | null;
  halftonePass: HalftonePass | null;
  pixelatedPass: RenderPixelatedPass | null;
  smaaPass: SMAAPass | null;
  ssrPass: SSRPass | null;
  unrealBloomPass: UnrealBloomPass | null;
};

export function applyRuntimePostProcessingPassConfig({
  camera,
  config,
  passes: passRefs
}: {
  camera: THREE.PerspectiveCamera;
  config: ResolvedEditorPostProcessingConfigJSON;
  passes: EditorRuntimePostProcessingPassRefs;
}) {
  const { passes } = config;

  if (passRefs.pixelatedPass) {
    passRefs.pixelatedPass.enabled = passes.pixelated.enabled;
    passRefs.pixelatedPass.setPixelSize(passes.pixelated.params.pixelSize);
    passRefs.pixelatedPass.normalEdgeStrength = passes.pixelated.params.normalEdgeStrength;
    passRefs.pixelatedPass.depthEdgeStrength = passes.pixelated.params.depthEdgeStrength;
  }

  if (passRefs.afterimagePass) {
    passRefs.afterimagePass.enabled = passes.afterimage.enabled;
    passRefs.afterimagePass.damp = passes.afterimage.params.damp;
  }

  if (passRefs.bokehPass) {
    const bokehUniforms = passRefs.bokehPass.materialBokeh.uniforms as Record<
      string,
      { value: number | THREE.Texture | null }
    >;
    passRefs.bokehPass.enabled = passes.bokeh.enabled;
    bokehUniforms.focus.value = passes.bokeh.params.focus;
    bokehUniforms.aperture.value = passes.bokeh.params.aperture;
    bokehUniforms.maxblur.value = passes.bokeh.params.maxblur;
    bokehUniforms.aspect.value = camera.aspect;
    bokehUniforms.nearClip.value = camera.near;
    bokehUniforms.farClip.value = camera.far;
  }

  if (passRefs.dotScreenPass) {
    const dotScreenUniforms = passRefs.dotScreenPass.uniforms as Record<
      string,
      { value: number | THREE.Vector2 | THREE.Texture | null }
    >;
    passRefs.dotScreenPass.enabled = passes.dotScreen.enabled;
    dotScreenUniforms.angle.value = passes.dotScreen.params.angle;
    dotScreenUniforms.scale.value = passes.dotScreen.params.scale;
  }

  if (passRefs.filmPass) {
    const filmUniforms = passRefs.filmPass.uniforms as Record<
      string,
      { value: number | boolean | THREE.Texture | null }
    >;
    passRefs.filmPass.enabled = passes.film.enabled;
    filmUniforms.intensity.value = passes.film.params.intensity;
    filmUniforms.grayscale.value = passes.film.params.grayscale;
  }

  if (passRefs.glitchPass) {
    passRefs.glitchPass.enabled = passes.glitch.enabled;
    passRefs.glitchPass.goWild = passes.glitch.params.goWild;
  }

  if (passRefs.gtaoPass) {
    passRefs.gtaoPass.enabled = passes.gtao.enabled;
    passRefs.gtaoPass.output = GTAOPass.OUTPUT.Default;
    passRefs.gtaoPass.blendIntensity = passes.gtao.params.blendIntensity;
    passRefs.gtaoPass.updateGtaoMaterial({
      radius: passes.gtao.params.radius,
      distanceFallOff: passes.gtao.params.distanceFallOff,
      thickness: passes.gtao.params.thickness
    });
    passRefs.gtaoPass.updatePdMaterial({
      lumaPhi: 10,
      depthPhi: 2,
      normalPhi: 3,
      radius: 8,
      radiusExponent: 2,
      rings: 2,
      samples: 16
    });
  }

  if (passRefs.halftonePass) {
    const halftoneUniforms = passRefs.halftonePass.uniforms as Record<
      string,
      { value: number | boolean | THREE.Texture | null }
    >;
    passRefs.halftonePass.enabled = passes.halftone.enabled;
    halftoneUniforms.shape.value = passes.halftone.params.shape;
    halftoneUniforms.radius.value = passes.halftone.params.radius;
    halftoneUniforms.scatter.value = passes.halftone.params.scatter;
    halftoneUniforms.blending.value = passes.halftone.params.blending;
    halftoneUniforms.blendingMode.value = passes.halftone.params.blendingMode;
    halftoneUniforms.greyscale.value = passes.halftone.params.greyscale;
  }

  if (passRefs.ssrPass) {
    passRefs.ssrPass.enabled = passes.ssr.enabled;
    passRefs.ssrPass.output = SSRPass.OUTPUT.Default;
    passRefs.ssrPass.opacity = passes.ssr.params.opacity;
    passRefs.ssrPass.maxDistance = passes.ssr.params.maxDistance;
    passRefs.ssrPass.thickness = passes.ssr.params.thickness;
    passRefs.ssrPass.blur = passes.ssr.params.blur;
    passRefs.ssrPass.distanceAttenuation = passes.ssr.params.distanceAttenuation;
    passRefs.ssrPass.fresnel = passes.ssr.params.fresnel;
    passRefs.ssrPass.infiniteThick = passes.ssr.params.infiniteThick;
    passRefs.ssrPass.bouncing = false;
    passRefs.ssrPass.selects = null;
  }

  if (passRefs.unrealBloomPass) {
    passRefs.unrealBloomPass.enabled = passes.unrealBloom.enabled;
    passRefs.unrealBloomPass.strength = passes.unrealBloom.params.strength;
    passRefs.unrealBloomPass.radius = passes.unrealBloom.params.radius;
    passRefs.unrealBloomPass.threshold = passes.unrealBloom.params.threshold;
  }
}

export function rebuildRuntimePostProcessingComposerPasses({
  composer,
  config,
  outputPass,
  outlinePass,
  passes,
  renderPass,
  studioColorGradingEnabled,
  studioColorGradingPass
}: {
  composer: EffectComposer;
  config: ResolvedEditorPostProcessingConfigJSON;
  outputPass: OutputPass;
  outlinePass: OutlinePass;
  passes: EditorRuntimePostProcessingPassRefs;
  renderPass: RenderPass;
  studioColorGradingEnabled: boolean;
  studioColorGradingPass: ReturnType<typeof createStudioColorGradingPass> | null;
}) {
  const composerWithPasses = composer as EffectComposer & { passes: Pass[] };
  composerWithPasses.passes.length = 0;
  composer.addPass(renderPass);

  appendEffectPass(composer, "pixelated", passes.pixelatedPass, config);
  appendEffectPass(composer, "gtao", passes.gtaoPass, config);
  appendEffectPass(composer, "ssr", passes.ssrPass, config);
  appendEffectPass(composer, "bokeh", passes.bokehPass, config);
  appendEffectPass(composer, "unrealBloom", passes.unrealBloomPass, config);
  appendEffectPass(composer, "afterimage", passes.afterimagePass, config);
  appendEffectPass(composer, "dotScreen", passes.dotScreenPass, config);
  appendEffectPass(composer, "halftone", passes.halftonePass, config);
  appendEffectPass(composer, "film", passes.filmPass, config);
  appendEffectPass(composer, "glitch", passes.glitchPass, config);

  if (studioColorGradingEnabled && studioColorGradingPass) {
    composer.addPass(studioColorGradingPass);
  }
  composer.addPass(outlinePass);
  if (passes.smaaPass) {
    composer.addPass(passes.smaaPass);
  }
  composer.addPass(outputPass);
}

function appendEffectPass(
  composer: EffectComposer,
  passId: EditorPostProcessPassId,
  pass: Pass | null,
  config: ResolvedEditorPostProcessingConfigJSON
) {
  if (!pass || !config.passes[passId].enabled) return;

  composer.addPass(pass);
}

export function disposePostProcessingPass(pass: { dispose?: (() => void) | undefined } | null | undefined) {
  if (!pass || typeof pass.dispose !== "function") return;

  try {
    pass.dispose();
  } catch (error) {
    const passName =
      typeof pass === "object" &&
      pass !== null &&
      "constructor" in pass &&
      pass.constructor &&
      typeof pass.constructor === "function" &&
      pass.constructor.name
        ? pass.constructor.name
        : "UnknownPass";
    console.warn(`[editor] Failed to dispose post-processing pass: ${passName}`, error);
  }
}
