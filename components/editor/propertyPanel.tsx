"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import type { EditorLightJSON } from "@/render/editor";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";
import type { Axis, AxisTextValues } from "@/components/common/propertyFieldControls";
import {
  LightNumberDraft,
  LightNumberField,
  LightSettingsSection,
  MeshAppearanceSection,
  TransformSection
} from "@/components/editor/propertyPanelSections";

const PANEL_WIDTH = 272;
const COLLAPSED_VISIBLE_WIDTH = 44;

const AXIS_INDEX: Record<Axis, number> = { x: 0, y: 1, z: 2 };

function formatNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "0";
  return Number(value.toFixed(digits)).toString();
}

function quaternionToDegrees(quaternion: [number, number, number, number]): [number, number, number] {
  const euler = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3]),
    "XYZ"
  );
  return [
    THREE.MathUtils.euclideanModulo(THREE.MathUtils.radToDeg(euler.x), 360),
    THREE.MathUtils.euclideanModulo(THREE.MathUtils.radToDeg(euler.y), 360),
    THREE.MathUtils.euclideanModulo(THREE.MathUtils.radToDeg(euler.z), 360)
  ];
}

function degreesToQuaternion(degrees: [number, number, number]): [number, number, number, number] {
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(degrees[0]),
    THREE.MathUtils.degToRad(degrees[1]),
    THREE.MathUtils.degToRad(degrees[2]),
    "XYZ"
  );
  const quaternion = new THREE.Quaternion().setFromEuler(euler);
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
}

function getLightTypeLabel(lightType: number, t: ReturnType<typeof useI18n>["t"]) {
  if (lightType === 2) return t("editor.light.directional");
  if (lightType === 3) return t("editor.light.point");
  if (lightType === 4) return t("editor.light.spot");
  if (lightType === 5) return t("editor.light.rectArea");
  return t("editor.light.ambient");
}

function buildDefaultPositionDraft(): AxisTextValues {
  return { x: "0", y: "0", z: "0" };
}

function buildDefaultRotationDraft(): [number, number, number] {
  return [0, 0, 0];
}

function buildDefaultLightNumberDraft(): LightNumberDraft {
  return {
    intensity: "1",
    distance: "0",
    decay: "2",
    width: "1",
    height: "1"
  };
}

function getTextureLabel(textureUrl: string, t: ReturnType<typeof useI18n>["t"]) {
  if (!textureUrl) return t("editor.properties.textureEmpty");
  const slashIndex = Math.max(textureUrl.lastIndexOf("/"), textureUrl.lastIndexOf("\\"));
  return slashIndex >= 0 ? textureUrl.slice(slashIndex + 1) || textureUrl : textureUrl;
}

export default function PropertyPanel() {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);
  const selectedEntityId = useEditorStore((state) => state.selectedEntityId);
  const projectVersion = useEditorStore((state) => state.projectVersion);
  const [open, setOpen] = useState(true);
  const [activePositionAxis, setActivePositionAxis] = useState<Axis | null>(null);
  const [activeRotationAxis, setActiveRotationAxis] = useState<Axis | null>(null);
  const [activeLightNumberField, setActiveLightNumberField] = useState<LightNumberField | null>(null);
  const [positionDraft, setPositionDraft] = useState<AxisTextValues>(buildDefaultPositionDraft);
  const [rotationDraft, setRotationDraft] = useState<[number, number, number]>(buildDefaultRotationDraft);
  const [lightNumberDraft, setLightNumberDraft] =
    useState<LightNumberDraft>(buildDefaultLightNumberDraft);
  const [meshTextureInputKey, setMeshTextureInputKey] = useState(0);
  const lastRotationQuaternionRef = useRef<string | null>(null);

  const entityRecord = useMemo(() => {
    const project = app?.projectModel;
    if (!project || !selectedEntityId) return null;

    const record = project.getEntityById(selectedEntityId);
    if (!record) return null;

    return {
      ...record,
      rotationDegrees: quaternionToDegrees(record.item.quaternion)
    };
  }, [app, selectedEntityId, projectVersion]);

  useEffect(() => {
    if (!entityRecord || activePositionAxis) return;
    const nextDraft = {
      x: formatNumber(entityRecord.item.position[0], 3),
      y: formatNumber(entityRecord.item.position[1], 3),
      z: formatNumber(entityRecord.item.position[2], 3)
    };
    setPositionDraft((prev) =>
      prev.x === nextDraft.x && prev.y === nextDraft.y && prev.z === nextDraft.z ? prev : nextDraft
    );
  }, [activePositionAxis, entityRecord]);

  useEffect(() => {
    if (!entityRecord) {
      setRotationDraft(buildDefaultRotationDraft());
      lastRotationQuaternionRef.current = null;
      return;
    }

    const quaternionKey = entityRecord.item.quaternion.map((value) => value.toFixed(6)).join(",");
    if (activeRotationAxis) {
      lastRotationQuaternionRef.current = quaternionKey;
      return;
    }

    if (lastRotationQuaternionRef.current === quaternionKey) return;

    setRotationDraft((prev) => {
      const next = entityRecord.rotationDegrees;
      return prev[0] === next[0] && prev[1] === next[1] && prev[2] === next[2] ? prev : next;
    });
    lastRotationQuaternionRef.current = quaternionKey;
  }, [activeRotationAxis, entityRecord]);

  useEffect(() => {
    if (!entityRecord || entityRecord.kind !== "light" || activeLightNumberField) return;
    const nextDraft = {
      intensity: formatNumber(entityRecord.item.intensity, 3),
      distance: formatNumber(entityRecord.item.distance, 3),
      decay: formatNumber(entityRecord.item.decay, 3),
      width: formatNumber(entityRecord.item.width, 3),
      height: formatNumber(entityRecord.item.height, 3)
    };
    setLightNumberDraft((prev) =>
      prev.intensity === nextDraft.intensity &&
      prev.distance === nextDraft.distance &&
      prev.decay === nextDraft.decay &&
      prev.width === nextDraft.width &&
      prev.height === nextDraft.height
        ? prev
        : nextDraft
    );
  }, [activeLightNumberField, entityRecord]);

  const commitPosition = () => {
    if (!app || !entityRecord) return;

    const nextPosition = (["x", "y", "z"] as const).map((axis, index) => {
      const parsed = Number.parseFloat(positionDraft[axis]);
      return Number.isFinite(parsed) ? parsed : entityRecord.item.position[index];
    }) as [number, number, number];

    setActivePositionAxis(null);
    setPositionDraft({
      x: formatNumber(nextPosition[0], 3),
      y: formatNumber(nextPosition[1], 3),
      z: formatNumber(nextPosition[2], 3)
    });
    app.updateEntityTransform(entityRecord.item.id, { position: nextPosition });
  };

  const updateRotation = (axis: Axis, value: number) => {
    if (!app || !entityRecord) return;
    const nextRotation = [...rotationDraft] as [number, number, number];
    nextRotation[AXIS_INDEX[axis]] = value;
    setRotationDraft(nextRotation);
    lastRotationQuaternionRef.current = degreesToQuaternion(nextRotation)
      .map((component) => component.toFixed(6))
      .join(",");
    app.updateEntityTransform(entityRecord.item.id, {
      quaternion: degreesToQuaternion(nextRotation)
    });
  };

  const commitRotation = (axis: Axis, value: number) => {
    setActiveRotationAxis((current) => (current === axis ? null : current));
    setRotationDraft((prev) => {
      const next = [...prev] as [number, number, number];
      next[AXIS_INDEX[axis]] = value;
      return next;
    });
  };

  const updateScale = (axis: Axis, value: number) => {
    if (!app || !entityRecord) return;
    const nextScale = [...entityRecord.item.scale] as [number, number, number];
    nextScale[AXIS_INDEX[axis]] = value;
    app.updateEntityTransform(entityRecord.item.id, { scale: nextScale });
  };

  const nudgePosition = (axis: Axis, delta: number) => {
    if (!app || !entityRecord) return;
    const index = AXIS_INDEX[axis];
    const baseValue = Number.parseFloat(positionDraft[axis]);
    const nextValue = (Number.isFinite(baseValue) ? baseValue : entityRecord.item.position[index]) + delta;
    const nextPosition = [...entityRecord.item.position] as [number, number, number];
    nextPosition[index] = Number(nextValue.toFixed(3));
    setPositionDraft({
      x: formatNumber(nextPosition[0], 3),
      y: formatNumber(nextPosition[1], 3),
      z: formatNumber(nextPosition[2], 3)
    });
    app.updateEntityTransform(entityRecord.item.id, { position: nextPosition });
  };

  const updateMeshColor = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!app || !entityRecord || entityRecord.kind !== "mesh") return;
    app.updateMeshMaterial(entityRecord.item.id, { color: event.target.value });
  };

  const updateLightColor = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!app || !entityRecord || entityRecord.kind !== "light") return;
    app.updateLight(entityRecord.item.id, { color: event.target.value });
  };

  const commitLightNumber = (field: LightNumberField) => {
    if (!app || !entityRecord || entityRecord.kind !== "light") return;

    const parsed = Number.parseFloat(lightNumberDraft[field]);
    const currentValue = entityRecord.item[field];
    const nextValue = Number.isFinite(parsed) ? parsed : currentValue;

    setActiveLightNumberField(null);
    setLightNumberDraft((prev) => ({
      ...prev,
      [field]: formatNumber(nextValue, 3)
    }));
    app.updateLight(entityRecord.item.id, { [field]: nextValue } satisfies Partial<EditorLightJSON>);
  };

  const nudgeLightNumber = (field: LightNumberField, delta: number) => {
    if (!app || !entityRecord || entityRecord.kind !== "light") return;
    const rawValue = Number.parseFloat(lightNumberDraft[field]);
    const currentValue = Number.isFinite(rawValue) ? rawValue : entityRecord.item[field];
    const nextValue = Number((currentValue + delta).toFixed(3));
    setLightNumberDraft((prev) => ({
      ...prev,
      [field]: formatNumber(nextValue, 3)
    }));
    app.updateLight(entityRecord.item.id, { [field]: nextValue } satisfies Partial<EditorLightJSON>);
  };

  const updateSpotLight = (patch: Partial<EditorLightJSON>) => {
    if (!app || !entityRecord || entityRecord.kind !== "light") return;
    app.updateLight(entityRecord.item.id, patch);
  };

  const onPickMeshTexture = () => {
    const input = document.getElementById("mesh-texture-input") as HTMLInputElement | null;
    input?.click();
  };

  const onMeshTextureSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setMeshTextureInputKey((value) => value + 1);
    if (!app || !entityRecord || entityRecord.kind !== "mesh" || !file) return;

    const textureUrl = URL.createObjectURL(file);
    app.updateMeshMaterial(entityRecord.item.id, { textureUrl });
  };

  const panelTitle = entityRecord
    ? entityRecord.kind === "model"
      ? t("editor.sceneTree.model")
      : entityRecord.kind === "mesh"
        ? t("editor.sceneTree.meshes")
        : getLightTypeLabel(entityRecord.item.lightType, t)
    : t("editor.properties.none");

  return (
    <Box
      sx={{
        position: "absolute",
        right: 0,
        top: 72,
        bottom: 0,
        zIndex: 21,
        width: PANEL_WIDTH,
        maxWidth: `calc(100vw - 20px)`,
        transform: open ? "translateX(0)" : `translateX(${PANEL_WIDTH - COLLAPSED_VISIBLE_WIDTH}px)`,
        transition: "transform 180ms ease"
      }}
    >
      <Box
        sx={{
          position: "relative",
          height: "100%",
          borderRadius: "12px 0 0 12px",
          border: "1px solid rgba(180,205,255,0.26)",
          borderRight: 0,
          background: "rgba(8,12,24,0.78)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
          overflow: "hidden"
        }}
      >
        <input
          key={meshTextureInputKey}
          id="mesh-texture-input"
          type="file"
          accept="image/*"
          onChange={onMeshTextureSelected}
          style={{ display: "none" }}
        />

        <Stack spacing={1} sx={{ height: "100%", p: open ? 1.05 : 0.7 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <IconButton
              size="small"
              onClick={() => setOpen((value) => !value)}
              sx={{
                color: "rgba(162,196,255,0.92)",
                border: "1px solid rgba(180,205,255,0.18)",
                background: "rgba(255,255,255,0.03)"
              }}
            >
              <TuneRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
            {open ? (
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "rgba(220,232,255,0.92)"
                }}
              >
                {t("editor.properties.title")}
              </Typography>
            ) : null}
          </Stack>

          {open ? (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                pr: 0.25
              }}
            >
            {!entityRecord ? (
              <Stack
                spacing={0.7}
                justifyContent="center"
                sx={{ height: "100%", minHeight: 180, color: "rgba(176,193,228,0.72)" }}
              >
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                  {t("editor.properties.none")}
                </Typography>
                <Typography sx={{ fontSize: 12 }}>
                  {t("editor.properties.emptyHint")}
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={0.9}>
                <Typography sx={{ px: 0.15, fontSize: 13, fontWeight: 600, color: "#eef5ff" }}>
                  {panelTitle}
                </Typography>

                <TransformSection
                  positionDraft={positionDraft}
                  rotationValues={rotationDraft}
                  scaleValues={entityRecord.item.scale}
                  onPositionFocus={setActivePositionAxis}
                  onPositionChange={(axis, value) =>
                    setPositionDraft((prev) => ({
                      ...prev,
                      [axis]: value
                    }))
                  }
                  onPositionCommit={commitPosition}
                  onPositionNudge={nudgePosition}
                  onRotationStart={setActiveRotationAxis}
                  onRotationChange={updateRotation}
                  onRotationCommit={commitRotation}
                  onScaleChange={updateScale}
                />

                {entityRecord.kind === "mesh" ? (
                  <MeshAppearanceSection
                    color={entityRecord.item.color}
                    textureLabel={getTextureLabel(entityRecord.item.textureUrl, t)}
                    onColorChange={updateMeshColor}
                    onTexturePick={onPickMeshTexture}
                  />
                ) : null}

                {entityRecord.kind === "light" ? (
                  <LightSettingsSection
                    lightType={entityRecord.item.lightType}
                    color={entityRecord.item.color}
                    angle={entityRecord.item.angle}
                    penumbra={entityRecord.item.penumbra}
                    lightNumberDraft={lightNumberDraft}
                    onColorChange={updateLightColor}
                    onFieldFocus={setActiveLightNumberField}
                    onFieldChange={(field, value) =>
                      setLightNumberDraft((prev) => ({ ...prev, [field]: value }))
                    }
                    onFieldCommit={commitLightNumber}
                    onFieldNudge={nudgeLightNumber}
                    onAngleChange={(value) =>
                      updateSpotLight({
                        angle: THREE.MathUtils.degToRad(value)
                      })
                    }
                    onPenumbraChange={(value) => updateSpotLight({ penumbra: value })}
                  />
                ) : null}
              </Stack>
            )}
            </Box>
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
}
