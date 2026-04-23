import type {
  EditorPostProcessPassId,
  EditorPostProcessingConfigJSON,
  ResolvedEditorPostProcessingConfigJSON
} from "./core/types";

export const EDITOR_POST_PROCESS_PASS_ORDER: EditorPostProcessPassId[] = [
  "gtao",
  "ssr",
  "bokeh",
  "unrealBloom",
  "afterimage",
  "dotScreen",
  "halftone",
  "film",
  "glitch"
];

export function createDefaultEditorPostProcessingConfigJSON(): ResolvedEditorPostProcessingConfigJSON {
  return {
    passes: {
      afterimage: {
        enabled: false,
        params: {
          damp: 0.92
        }
      },
      bokeh: {
        enabled: false,
        params: {
          focus: 15,
          aperture: 0.01,
          maxblur: 0.01
        }
      },
      film: {
        enabled: false,
        params: {
          intensity: 0.35,
          grayscale: false
        }
      },
      dotScreen: {
        enabled: false,
        params: {
          angle: 0.5,
          scale: 1
        }
      },
      gtao: {
        enabled: false,
        params: {
          blendIntensity: 1,
          radius: 0.5,
          distanceFallOff: 1,
          thickness: 1
        }
      },
      glitch: {
        enabled: false,
        params: {
          goWild: false
        }
      },
      halftone: {
        enabled: false,
        params: {
          shape: 1,
          radius: 4,
          scatter: 0,
          blending: 1,
          blendingMode: 1,
          greyscale: false
        }
      },
      ssr: {
        enabled: false,
        params: {
          opacity: 0.5,
          maxDistance: 180,
          thickness: 0.018,
          blur: true,
          distanceAttenuation: true,
          fresnel: true,
          infiniteThick: false
        }
      },
      unrealBloom: {
        enabled: false,
        params: {
          strength: 0.8,
          radius: 0.2,
          threshold: 0.85
        }
      }
    }
  };
}

export function cloneEditorPostProcessingConfig(
  config: ResolvedEditorPostProcessingConfigJSON
): ResolvedEditorPostProcessingConfigJSON {
  return {
    passes: {
      afterimage: {
        enabled: config.passes.afterimage.enabled,
        params: {
          ...config.passes.afterimage.params
        }
      },
      bokeh: {
        enabled: config.passes.bokeh.enabled,
        params: {
          ...config.passes.bokeh.params
        }
      },
      film: {
        enabled: config.passes.film.enabled,
        params: {
          ...config.passes.film.params
        }
      },
      dotScreen: {
        enabled: config.passes.dotScreen.enabled,
        params: {
          ...config.passes.dotScreen.params
        }
      },
      gtao: {
        enabled: config.passes.gtao.enabled,
        params: {
          ...config.passes.gtao.params
        }
      },
      glitch: {
        enabled: config.passes.glitch.enabled,
        params: {
          ...config.passes.glitch.params
        }
      },
      halftone: {
        enabled: config.passes.halftone.enabled,
        params: {
          ...config.passes.halftone.params
        }
      },
      ssr: {
        enabled: config.passes.ssr.enabled,
        params: {
          ...config.passes.ssr.params
        }
      },
      unrealBloom: {
        enabled: config.passes.unrealBloom.enabled,
        params: {
          ...config.passes.unrealBloom.params
        }
      }
    }
  };
}

export function normalizeEditorPostProcessingConfig(
  source?: EditorPostProcessingConfigJSON
): ResolvedEditorPostProcessingConfigJSON {
  const defaults = createDefaultEditorPostProcessingConfigJSON();

  return {
    passes: {
      afterimage: {
        enabled: source?.passes?.afterimage?.enabled ?? defaults.passes.afterimage.enabled,
        params: {
          ...defaults.passes.afterimage.params,
          ...source?.passes?.afterimage?.params
        }
      },
      bokeh: {
        enabled: source?.passes?.bokeh?.enabled ?? defaults.passes.bokeh.enabled,
        params: {
          ...defaults.passes.bokeh.params,
          ...source?.passes?.bokeh?.params
        }
      },
      film: {
        enabled: source?.passes?.film?.enabled ?? defaults.passes.film.enabled,
        params: {
          ...defaults.passes.film.params,
          ...source?.passes?.film?.params
        }
      },
      dotScreen: {
        enabled: source?.passes?.dotScreen?.enabled ?? defaults.passes.dotScreen.enabled,
        params: {
          ...defaults.passes.dotScreen.params,
          ...source?.passes?.dotScreen?.params
        }
      },
      gtao: {
        enabled: source?.passes?.gtao?.enabled ?? defaults.passes.gtao.enabled,
        params: {
          ...defaults.passes.gtao.params,
          ...source?.passes?.gtao?.params
        }
      },
      glitch: {
        enabled: source?.passes?.glitch?.enabled ?? defaults.passes.glitch.enabled,
        params: {
          ...defaults.passes.glitch.params,
          ...source?.passes?.glitch?.params
        }
      },
      halftone: {
        enabled: source?.passes?.halftone?.enabled ?? defaults.passes.halftone.enabled,
        params: {
          ...defaults.passes.halftone.params,
          ...source?.passes?.halftone?.params
        }
      },
      ssr: {
        enabled: source?.passes?.ssr?.enabled ?? defaults.passes.ssr.enabled,
        params: {
          ...defaults.passes.ssr.params,
          ...source?.passes?.ssr?.params
        }
      },
      unrealBloom: {
        enabled: source?.passes?.unrealBloom?.enabled ?? defaults.passes.unrealBloom.enabled,
        params: {
          ...defaults.passes.unrealBloom.params,
          ...source?.passes?.unrealBloom?.params
        }
      }
    }
  };
}

export function mergeEditorPostProcessingConfig(
  current: ResolvedEditorPostProcessingConfigJSON,
  patch?: EditorPostProcessingConfigJSON
): ResolvedEditorPostProcessingConfigJSON {
  if (!patch) {
    return cloneEditorPostProcessingConfig(current);
  }

  const next = cloneEditorPostProcessingConfig(current);
  const nextPasses = next.passes as Record<
    EditorPostProcessPassId,
    { enabled: boolean; params: Record<string, boolean | number> }
  >;
  const currentPasses = current.passes as Record<
    EditorPostProcessPassId,
    { enabled: boolean; params: Record<string, boolean | number> }
  >;

  for (const passId of EDITOR_POST_PROCESS_PASS_ORDER) {
    const patchPass = patch.passes?.[passId];
    if (!patchPass) continue;

    nextPasses[passId] = {
      enabled: patchPass.enabled ?? currentPasses[passId].enabled,
      params: {
        ...currentPasses[passId].params,
        ...(patchPass.params ?? {})
      }
    };
  }

  return next;
}
