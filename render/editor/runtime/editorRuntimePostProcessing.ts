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
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { SSRPass } from "three/examples/jsm/postprocessing/SSRPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import type { EditorPostProcessPassId, ResolvedEditorPostProcessingConfigJSON } from "../core/types";

type EditorRuntimePostProcessingOptions = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
};

export class EditorRuntimePostProcessing {
  readonly composer: EffectComposer;

  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly renderPass: RenderPass;
  private readonly outlinePass: OutlinePass;
  private afterimagePass: AfterimagePass | null = null;
  private bokehPass: BokehPass | null = null;
  private dotScreenPass: DotScreenPass | null = null;
  private filmPass: FilmPass | null = null;
  private glitchPass: GlitchPass | null = null;
  private gtaoPass: GTAOPass | null = null;
  private halftonePass: HalftonePass | null = null;
  private smaaPass: SMAAPass | null = null;
  private ssrPass: SSRPass | null = null;
  private unrealBloomPass: UnrealBloomPass | null = null;
  private initialized = false;

  constructor({ scene, camera, renderer }: EditorRuntimePostProcessingOptions) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.composer = new EffectComposer(
      this.renderer,
      new THREE.WebGLRenderTarget(1, 1, {
        depthBuffer: true
      })
    );
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.outlinePass = new OutlinePass(new THREE.Vector2(1, 1), this.scene, this.camera);
    this.outlinePass.edgeStrength = 5.5;
    this.outlinePass.edgeGlow = 0.45;
    this.outlinePass.edgeThickness = 1.4;
    this.outlinePass.pulsePeriod = 0;
    this.outlinePass.visibleEdgeColor.set("#7bc4ff");
    this.outlinePass.hiddenEdgeColor.set("#2a5a88");
  }

  render(deltaSeconds = 0) {
    this.composer.render(deltaSeconds);
  }

  setOutlineSelection(objects: THREE.Object3D[]) {
    this.outlinePass.selectedObjects = objects;
  }

  applyConfig(config: ResolvedEditorPostProcessingConfigJSON) {
    this.ensurePasses();

    const { passes } = config;

    if (this.afterimagePass) {
      this.afterimagePass.enabled = passes.afterimage.enabled;
      this.afterimagePass.damp = passes.afterimage.params.damp;
    }

    if (this.bokehPass) {
      const bokehUniforms = this.bokehPass.materialBokeh.uniforms as Record<
        string,
        { value: number | THREE.Texture | null }
      >;
      this.bokehPass.enabled = passes.bokeh.enabled;
      bokehUniforms.focus.value = passes.bokeh.params.focus;
      bokehUniforms.aperture.value = passes.bokeh.params.aperture;
      bokehUniforms.maxblur.value = passes.bokeh.params.maxblur;
      bokehUniforms.aspect.value = this.camera.aspect;
      bokehUniforms.nearClip.value = this.camera.near;
      bokehUniforms.farClip.value = this.camera.far;
    }

    if (this.dotScreenPass) {
      const dotScreenUniforms = this.dotScreenPass.uniforms as Record<
        string,
        { value: number | THREE.Vector2 | THREE.Texture | null }
      >;
      this.dotScreenPass.enabled = passes.dotScreen.enabled;
      dotScreenUniforms.angle.value = passes.dotScreen.params.angle;
      dotScreenUniforms.scale.value = passes.dotScreen.params.scale;
    }

    if (this.filmPass) {
      const filmUniforms = this.filmPass.uniforms as Record<
        string,
        { value: number | boolean | THREE.Texture | null }
      >;
      this.filmPass.enabled = passes.film.enabled;
      filmUniforms.intensity.value = passes.film.params.intensity;
      filmUniforms.grayscale.value = passes.film.params.grayscale;
    }

    if (this.glitchPass) {
      this.glitchPass.enabled = passes.glitch.enabled;
      this.glitchPass.goWild = passes.glitch.params.goWild;
    }

    if (this.gtaoPass) {
      this.gtaoPass.enabled = passes.gtao.enabled;
      this.gtaoPass.output = GTAOPass.OUTPUT.Default;
      this.gtaoPass.blendIntensity = passes.gtao.params.blendIntensity;
      this.gtaoPass.updateGtaoMaterial({
        radius: passes.gtao.params.radius,
        distanceFallOff: passes.gtao.params.distanceFallOff,
        thickness: passes.gtao.params.thickness
      });
      this.gtaoPass.updatePdMaterial({
        lumaPhi: 10,
        depthPhi: 2,
        normalPhi: 3,
        radius: 8,
        radiusExponent: 2,
        rings: 2,
        samples: 16
      });
    }

    if (this.halftonePass) {
      const halftoneUniforms = this.halftonePass.uniforms as Record<
        string,
        { value: number | boolean | THREE.Texture | null }
      >;
      this.halftonePass.enabled = passes.halftone.enabled;
      halftoneUniforms.shape.value = passes.halftone.params.shape;
      halftoneUniforms.radius.value = passes.halftone.params.radius;
      halftoneUniforms.scatter.value = passes.halftone.params.scatter;
      halftoneUniforms.blending.value = passes.halftone.params.blending;
      halftoneUniforms.blendingMode.value = passes.halftone.params.blendingMode;
      halftoneUniforms.greyscale.value = passes.halftone.params.greyscale;
    }

    if (this.ssrPass) {
      this.ssrPass.enabled = passes.ssr.enabled;
      this.ssrPass.output = SSRPass.OUTPUT.Default;
      this.ssrPass.opacity = passes.ssr.params.opacity;
      this.ssrPass.maxDistance = passes.ssr.params.maxDistance;
      this.ssrPass.thickness = passes.ssr.params.thickness;
      this.ssrPass.blur = passes.ssr.params.blur;
      this.ssrPass.distanceAttenuation = passes.ssr.params.distanceAttenuation;
      this.ssrPass.fresnel = passes.ssr.params.fresnel;
      this.ssrPass.infiniteThick = passes.ssr.params.infiniteThick;
      this.ssrPass.bouncing = false;
      this.ssrPass.selects = null;
    }

    if (this.unrealBloomPass) {
      this.unrealBloomPass.enabled = passes.unrealBloom.enabled;
      this.unrealBloomPass.strength = passes.unrealBloom.params.strength;
      this.unrealBloomPass.radius = passes.unrealBloom.params.radius;
      this.unrealBloomPass.threshold = passes.unrealBloom.params.threshold;
    }

    this.outlinePass.enabled = true;
    if (this.smaaPass) {
      this.smaaPass.enabled = true;
    }
    this.rebuildComposerPasses(config);
  }

  syncCameraState() {
    if (!this.initialized) return;

    if (this.bokehPass) {
      const bokehUniforms = this.bokehPass.materialBokeh.uniforms as Record<
        string,
        { value: number | THREE.Texture | null }
      >;
      bokehUniforms.aspect.value = this.camera.aspect;
      bokehUniforms.nearClip.value = this.camera.near;
      bokehUniforms.farClip.value = this.camera.far;
    }

    if (this.gtaoPass) {
      this.gtaoPass.setSize(this.gtaoPass.width, this.gtaoPass.height);
    }

    if (this.ssrPass) {
      this.ssrPass.setSize(this.ssrPass.width, this.ssrPass.height);
    }

  }

  setSize(width: number, height: number) {
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.syncPassSize(width, height);
  }

  dispose() {
    this.afterimagePass?.dispose();
    this.bokehPass?.dispose();
    this.dotScreenPass?.dispose();
    this.filmPass?.dispose();
    this.glitchPass?.dispose();
    this.gtaoPass?.dispose();
    this.halftonePass?.dispose();
    this.outlinePass.dispose();
    this.smaaPass?.dispose();
    this.ssrPass?.dispose();
    this.unrealBloomPass?.dispose();
    this.afterimagePass = null;
    this.bokehPass = null;
    this.dotScreenPass = null;
    this.filmPass = null;
    this.glitchPass = null;
    this.gtaoPass = null;
    this.halftonePass = null;
    this.smaaPass = null;
    this.ssrPass = null;
    this.unrealBloomPass = null;
    this.initialized = false;
    this.composer.dispose();
  }

  private ensurePasses() {
    if (this.initialized) return;

    const size = this.renderer.getSize(new THREE.Vector2());
    const width = Math.max(1, size.x);
    const height = Math.max(1, size.y);
    const resolution = new THREE.Vector2(width, height);

    this.gtaoPass = new GTAOPass(this.scene, this.camera, width, height);
    this.gtaoPass.output = GTAOPass.OUTPUT.Default;
    this.gtaoPass.enabled = false;

    this.ssrPass = new SSRPass({
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      width,
      height,
      selects: null,
      groundReflector: null
    });
    this.ssrPass.output = SSRPass.OUTPUT.Default;
    this.ssrPass.enabled = false;
    this.ssrPass.bouncing = false;

    this.bokehPass = new BokehPass(this.scene, this.camera, {
      focus: 15,
      aperture: 0.01,
      maxblur: 0.01
    });
    this.bokehPass.enabled = false;

    this.unrealBloomPass = new UnrealBloomPass(resolution, 0.8, 0.2, 0.85);
    this.unrealBloomPass.enabled = false;

    this.afterimagePass = new AfterimagePass(0.92);
    this.afterimagePass.enabled = false;

    this.dotScreenPass = new DotScreenPass(new THREE.Vector2(width / 2, height / 2), 0.5, 1);
    this.dotScreenPass.enabled = false;

    this.halftonePass = new HalftonePass({
      shape: 1,
      radius: 4,
      scatter: 0,
      blending: 1,
      blendingMode: 1,
      greyscale: false
    });
    this.halftonePass.enabled = false;

    this.filmPass = new FilmPass(0.35, false);
    this.filmPass.enabled = false;

    this.glitchPass = new GlitchPass();
    this.glitchPass.enabled = false;
    this.glitchPass.goWild = false;

    this.smaaPass = new SMAAPass();
    this.smaaPass.enabled = true;

    this.initialized = true;
    this.syncPassSize(width, height);
    this.syncCameraState();
  }

  private syncPassSize(width: number, height: number) {
    if (!this.initialized) return;

    const effectiveWidth = Math.max(1, Math.round(width * this.renderer.getPixelRatio()));
    const effectiveHeight = Math.max(1, Math.round(height * this.renderer.getPixelRatio()));

    if (this.bokehPass) {
      const bokehUniforms = this.bokehPass.materialBokeh.uniforms as Record<
        string,
        { value: number | THREE.Texture | null }
      >;
      bokehUniforms.aspect.value = width / Math.max(height, 1);
      bokehUniforms.nearClip.value = this.camera.near;
      bokehUniforms.farClip.value = this.camera.far;
    }

    if (this.dotScreenPass) {
      const dotScreenUniforms = this.dotScreenPass.uniforms as Record<
        string,
        { value: number | THREE.Vector2 | THREE.Texture | null }
      >;
      const center = dotScreenUniforms.center.value;
      if (center instanceof THREE.Vector2) {
        center.set(effectiveWidth / 2, effectiveHeight / 2);
      }
    }

    if (this.halftonePass) {
      this.halftonePass.uniforms.width.value = effectiveWidth;
      this.halftonePass.uniforms.height.value = effectiveHeight;
    }
  }

  private rebuildComposerPasses(config: ResolvedEditorPostProcessingConfigJSON) {
    const composerWithPasses = this.composer as EffectComposer & { passes: Pass[] };
    composerWithPasses.passes.length = 0;
    this.composer.addPass(this.renderPass);

    this.appendEffectPass("gtao", this.gtaoPass, config);
    this.appendEffectPass("ssr", this.ssrPass, config);
    this.appendEffectPass("bokeh", this.bokehPass, config);
    this.appendEffectPass("unrealBloom", this.unrealBloomPass, config);
    this.appendEffectPass("afterimage", this.afterimagePass, config);
    this.appendEffectPass("dotScreen", this.dotScreenPass, config);
    this.appendEffectPass("halftone", this.halftonePass, config);
    this.appendEffectPass("film", this.filmPass, config);
    this.appendEffectPass("glitch", this.glitchPass, config);

    this.composer.addPass(this.outlinePass);
    if (this.smaaPass) {
      this.composer.addPass(this.smaaPass);
    }
  }

  private appendEffectPass(
    passId: EditorPostProcessPassId,
    pass: Pass | null,
    config: ResolvedEditorPostProcessingConfigJSON
  ) {
    if (!pass || !config.passes[passId].enabled) return;

    this.composer.addPass(pass);
  }
}
