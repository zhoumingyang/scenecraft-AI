import * as THREE from "three";
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

import type { ResolvedEditorPostProcessingConfigJSON } from "../core/types";
import type { StudioColorGradingConfig } from "../studioColorGrading";
import {
  createStudioColorGradingPass,
  setStudioColorGradingPassSize,
  updateStudioColorGradingPass
} from "./studioColorGradingPass";
import {
  applyRuntimePostProcessingPassConfig,
  disposePostProcessingPass,
  rebuildRuntimePostProcessingComposerPasses,
  type EditorRuntimePostProcessingPassRefs
} from "./editorRuntimePostProcessingPasses";

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
  private readonly outputPass: OutputPass;
  private pixelatedPass: RenderPixelatedPass | null = null;
  private afterimagePass: AfterimagePass | null = null;
  private bokehPass: BokehPass | null = null;
  private dotScreenPass: DotScreenPass | null = null;
  private filmPass: FilmPass | null = null;
  private glitchPass: GlitchPass | null = null;
  private gtaoPass: GTAOPass | null = null;
  private halftonePass: HalftonePass | null = null;
  private smaaPass: SMAAPass | null = null;
  private ssrPass: SSRPass | null = null;
  private studioColorGradingPass: ReturnType<typeof createStudioColorGradingPass> | null = null;
  private studioColorGradingEnabled = false;
  private unrealBloomPass: UnrealBloomPass | null = null;
  private currentConfig: ResolvedEditorPostProcessingConfigJSON | null = null;
  private readonly viewportSize = new THREE.Vector2(1, 1);

  constructor({ scene, camera, renderer }: EditorRuntimePostProcessingOptions) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.composer = new EffectComposer(
      this.renderer,
      new THREE.WebGLRenderTarget(1, 1, {
        depthBuffer: true,
        type: THREE.HalfFloatType
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
    this.outputPass = new OutputPass();
  }

  render(deltaSeconds = 0) {
    this.composer.render(deltaSeconds);
  }

  getOutlineEnabled() {
    return this.outlinePass.enabled;
  }

  setOutlineEnabled(enabled: boolean) {
    this.outlinePass.enabled = enabled;
  }

  setOutlineSelection(objects: THREE.Object3D[]) {
    this.outlinePass.selectedObjects = objects;
  }

  applyConfig(config: ResolvedEditorPostProcessingConfigJSON) {
    this.currentConfig = config;
    this.ensureConfiguredPasses(config);
    applyRuntimePostProcessingPassConfig({
      camera: this.camera,
      config,
      passes: this.getPassRefs()
    });

    this.outlinePass.enabled = true;
    if (this.smaaPass) {
      this.smaaPass.enabled = true;
    }
    this.rebuildComposerPasses(config);
  }

  applyStudioColorGradingConfig(config: StudioColorGradingConfig | null) {
    if (!config) {
      this.studioColorGradingEnabled = false;
      if (this.studioColorGradingPass) {
        this.studioColorGradingPass.enabled = false;
      }
      if (this.currentConfig) {
        this.rebuildComposerPasses(this.currentConfig);
      }
      return;
    }

    this.ensureStudioColorGradingPass(config);
    this.studioColorGradingEnabled = true;
    if (this.studioColorGradingPass) {
      this.studioColorGradingPass.enabled = true;
      updateStudioColorGradingPass(this.studioColorGradingPass, config);
    }
    if (this.currentConfig) {
      this.rebuildComposerPasses(this.currentConfig);
    }
  }

  syncCameraState() {
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
    this.viewportSize.set(Math.max(1, width), Math.max(1, height));
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.syncPassSize(width, height);
  }

  dispose() {
    disposePostProcessingPass(this.pixelatedPass);
    disposePostProcessingPass(this.afterimagePass);
    disposePostProcessingPass(this.bokehPass);
    disposePostProcessingPass(this.dotScreenPass);
    disposePostProcessingPass(this.filmPass);
    disposePostProcessingPass(this.glitchPass);
    disposePostProcessingPass(this.gtaoPass);
    disposePostProcessingPass(this.halftonePass);
    disposePostProcessingPass(this.outlinePass);
    disposePostProcessingPass(this.outputPass);
    disposePostProcessingPass(this.smaaPass);
    disposePostProcessingPass(this.ssrPass);
    disposePostProcessingPass(this.studioColorGradingPass);
    disposePostProcessingPass(this.unrealBloomPass);
    this.pixelatedPass = null;
    this.afterimagePass = null;
    this.bokehPass = null;
    this.dotScreenPass = null;
    this.filmPass = null;
    this.glitchPass = null;
    this.gtaoPass = null;
    this.halftonePass = null;
    this.smaaPass = null;
    this.ssrPass = null;
    this.studioColorGradingPass = null;
    this.unrealBloomPass = null;
    this.composer.dispose();
  }

  private ensureConfiguredPasses(config: ResolvedEditorPostProcessingConfigJSON) {
    if (config.passes.pixelated.enabled) {
      this.ensurePixelatedPass();
    }
    if (config.passes.gtao.enabled) {
      this.ensureGtaoPass();
    }
    if (config.passes.ssr.enabled) {
      this.ensureSsrPass();
    }
    if (config.passes.bokeh.enabled) {
      this.ensureBokehPass();
    }
    if (config.passes.unrealBloom.enabled) {
      this.ensureUnrealBloomPass();
    }
    if (config.passes.afterimage.enabled) {
      this.ensureAfterimagePass();
    }
    if (config.passes.dotScreen.enabled) {
      this.ensureDotScreenPass();
    }
    if (config.passes.halftone.enabled) {
      this.ensureHalftonePass();
    }
    if (config.passes.film.enabled) {
      this.ensureFilmPass();
    }
    if (config.passes.glitch.enabled) {
      this.ensureGlitchPass();
    }
    this.ensureSmaaPass();
  }

  private getCurrentSize() {
    const rendererSize = this.renderer.getSize(this.viewportSize);
    const width = Math.max(1, rendererSize.x);
    const height = Math.max(1, rendererSize.y);
    this.viewportSize.set(width, height);
    return { width, height };
  }

  private ensurePixelatedPass() {
    if (this.pixelatedPass) return;

    const { width, height } = this.getCurrentSize();
    const effectiveWidth = Math.max(1, Math.round(width * this.renderer.getPixelRatio()));
    const effectiveHeight = Math.max(1, Math.round(height * this.renderer.getPixelRatio()));
    this.pixelatedPass = new RenderPixelatedPass(6, this.scene, this.camera, {
      normalEdgeStrength: 0.3,
      depthEdgeStrength: 0.4
    });
    this.pixelatedPass.enabled = false;
    this.pixelatedPass.setSize(effectiveWidth, effectiveHeight);
  }

  private ensureGtaoPass() {
    if (this.gtaoPass) return;

    const { width, height } = this.getCurrentSize();
    this.gtaoPass = new GTAOPass(this.scene, this.camera, width, height);
    this.gtaoPass.output = GTAOPass.OUTPUT.Default;
    this.gtaoPass.enabled = false;
  }

  private ensureSsrPass() {
    if (this.ssrPass) return;

    const { width, height } = this.getCurrentSize();
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
  }

  private ensureBokehPass() {
    if (this.bokehPass) return;

    const { width, height } = this.getCurrentSize();
    this.bokehPass = new BokehPass(this.scene, this.camera, {
      focus: 15,
      aperture: 0.01,
      maxblur: 0.01
    });
    this.bokehPass.enabled = false;
    this.syncPassSize(width, height);
  }

  private ensureUnrealBloomPass() {
    if (this.unrealBloomPass) return;

    const { width, height } = this.getCurrentSize();
    const resolution = new THREE.Vector2(width, height);
    this.unrealBloomPass = new UnrealBloomPass(resolution, 0.8, 0.2, 0.85);
    this.unrealBloomPass.enabled = false;
  }

  private ensureAfterimagePass() {
    if (this.afterimagePass) return;

    this.afterimagePass = new AfterimagePass(0.92);
    this.afterimagePass.enabled = false;
  }

  private ensureDotScreenPass() {
    if (this.dotScreenPass) return;

    const { width, height } = this.getCurrentSize();

    this.dotScreenPass = new DotScreenPass(new THREE.Vector2(width / 2, height / 2), 0.5, 1);
    this.dotScreenPass.enabled = false;
  }

  private ensureHalftonePass() {
    if (this.halftonePass) return;

    const { width, height } = this.getCurrentSize();
    this.halftonePass = new HalftonePass({
      shape: 1,
      radius: 4,
      scatter: 0,
      blending: 1,
      blendingMode: 1,
      greyscale: false
    });
    this.halftonePass.enabled = false;
    this.syncPassSize(width, height);
  }

  private ensureFilmPass() {
    if (this.filmPass) return;

    this.filmPass = new FilmPass(0.35, false);
    this.filmPass.enabled = false;
  }

  private ensureGlitchPass() {
    if (this.glitchPass) return;

    this.glitchPass = new GlitchPass();
    this.glitchPass.enabled = false;
    this.glitchPass.goWild = false;
  }

  private ensureSmaaPass() {
    if (this.smaaPass) return;

    this.smaaPass = new SMAAPass();
    this.smaaPass.enabled = true;
  }

  private ensureStudioColorGradingPass(config: StudioColorGradingConfig) {
    if (this.studioColorGradingPass) return;

    this.studioColorGradingPass = createStudioColorGradingPass(config);
    this.studioColorGradingPass.enabled = false;
    const { width, height } = this.getCurrentSize();
    setStudioColorGradingPassSize(this.studioColorGradingPass, width, height);
  }

  private syncPassSize(width: number, height: number) {
    const effectiveWidth = Math.max(1, Math.round(width * this.renderer.getPixelRatio()));
    const effectiveHeight = Math.max(1, Math.round(height * this.renderer.getPixelRatio()));

    this.pixelatedPass?.setSize(effectiveWidth, effectiveHeight);

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

    if (this.studioColorGradingPass) {
      setStudioColorGradingPassSize(
        this.studioColorGradingPass,
        effectiveWidth,
        effectiveHeight
      );
    }
  }

  private rebuildComposerPasses(config: ResolvedEditorPostProcessingConfigJSON) {
    rebuildRuntimePostProcessingComposerPasses({
      composer: this.composer,
      config,
      outputPass: this.outputPass,
      outlinePass: this.outlinePass,
      passes: this.getPassRefs(),
      renderPass: this.renderPass,
      studioColorGradingEnabled: this.studioColorGradingEnabled,
      studioColorGradingPass: this.studioColorGradingPass
    });
  }

  private getPassRefs(): EditorRuntimePostProcessingPassRefs {
    return {
      afterimagePass: this.afterimagePass,
      bokehPass: this.bokehPass,
      dotScreenPass: this.dotScreenPass,
      filmPass: this.filmPass,
      glitchPass: this.glitchPass,
      gtaoPass: this.gtaoPass,
      halftonePass: this.halftonePass,
      pixelatedPass: this.pixelatedPass,
      smaaPass: this.smaaPass,
      ssrPass: this.ssrPass,
      unrealBloomPass: this.unrealBloomPass
    };
  }
}
