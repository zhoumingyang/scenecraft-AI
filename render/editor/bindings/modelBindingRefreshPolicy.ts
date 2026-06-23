type ModelRuntimeFrameInput = {
  animationUpdated: boolean;
  assetUpdated: boolean;
};

export function shouldInvalidatePathTraceForModelRuntimeFrame(
  _input: ModelRuntimeFrameInput
) {
  return false;
}
