export function buildAiPbrTexturePrompt(userPrompt: string) {
  return [
    "Generate one single realistic PBR material texture atlas image.",
    "",
    "User material request:",
    userPrompt,
    "",
    "Atlas layout requirements:",
    "- The image must be a strict 3 column by 2 row atlas.",
    "- The final image must be exactly 1584x1056 pixels with a 3:2 aspect ratio.",
    "- Top row, left to right: diffuse/albedo map, metalness map, roughness map.",
    "- Bottom row, left to right: normal map, ambient occlusion map, emissive map.",
    "- Every slot must be exactly 528x528 pixels and align exactly to the 3x2 grid.",
    "- Do not add text, labels, numbers, icons, captions, watermarks, borders, grid lines, gutters, or annotations.",
    "",
    "PBR map requirements:",
    "- Diffuse/albedo slot: realistic base color only, no baked lighting or shadows.",
    "- Metalness slot: grayscale values, white for metallic areas and black for non-metallic areas.",
    "- Roughness slot: grayscale values, brighter for rougher areas and darker for glossier areas.",
    "- Normal slot: tangent-space normal map colors, mostly blue/purple, matching the material details.",
    "- Ambient occlusion slot: grayscale occlusion map, darker in cracks and crevices.",
    "- Emissive slot: black unless the material should visibly glow; include glow mask only where appropriate.",
    "",
    "Material quality requirements:",
    "- The material must be seamless and tileable.",
    "- Use a physically plausible, production-ready, realistic style.",
    "- Each slot should describe the same material features so the maps align when sampled."
  ].join("\n");
}
