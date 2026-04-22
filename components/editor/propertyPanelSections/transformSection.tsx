"use client";

import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { Checkbox, FormControlLabel, Stack, Typography } from "@mui/material";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import { getEditorThemeTokens } from "@/components/editor/theme";
import {
  Axis,
  AxisNumberInputs,
  AxisSliderGroup
} from "@/components/common/propertyFieldControls";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";
import { formatDegrees, formatNumber, AXIS_INDEX, buildDefaultPositionDraft, buildDefaultRotationDraft, degreesToQuaternion, quaternionToDegrees } from "./util";

type TransformSectionProps = {
  entityId: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scaleValues: [number, number, number];
};

export function TransformSection({
  entityId,
  position,
  quaternion,
  scaleValues
}: TransformSectionProps) {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);
  const [isUniformScaleEnabled, setIsUniformScaleEnabled] = useState(false);
  const [activePositionAxis, setActivePositionAxis] = useState<Axis | null>(null);
  const [activeRotationAxis, setActiveRotationAxis] = useState<Axis | null>(null);
  const [positionDraft, setPositionDraft] = useState(buildDefaultPositionDraft);
  const [rotationDraft, setRotationDraft] = useState<[number, number, number]>(buildDefaultRotationDraft);
  const lastRotationQuaternionRef = useRef<string | null>(null);
  const gizmoRotationDraftRef = useRef<{
    axis: Axis;
    startDraft: [number, number, number];
  } | null>(null);

  useEffect(() => {
    if (activePositionAxis) return;
    const nextDraft = {
      x: formatNumber(position[0], 3),
      y: formatNumber(position[1], 3),
      z: formatNumber(position[2], 3)
    };
    setPositionDraft((prev) =>
      prev.x === nextDraft.x && prev.y === nextDraft.y && prev.z === nextDraft.z ? prev : nextDraft
    );
  }, [activePositionAxis, position]);

  useEffect(() => {
    const quaternionKey = quaternion.map((value) => value.toFixed(6)).join(",");
    if (activeRotationAxis) {
      lastRotationQuaternionRef.current = quaternionKey;
      return;
    }

    const activeGizmoRotation = app?.getActiveTransformRotationDrag() ?? null;
    if (activeGizmoRotation) {
      setRotationDraft((prev) => {
        const currentSession = gizmoRotationDraftRef.current;
        if (!currentSession || currentSession.axis !== activeGizmoRotation.axis) {
          gizmoRotationDraftRef.current = {
            axis: activeGizmoRotation.axis,
            startDraft: [...prev] as [number, number, number]
          };
        }

        const session = gizmoRotationDraftRef.current;
        if (!session) return prev;
        const next = [...session.startDraft] as [number, number, number];
        next[AXIS_INDEX[activeGizmoRotation.axis]] = THREE.MathUtils.euclideanModulo(
          session.startDraft[AXIS_INDEX[activeGizmoRotation.axis]] +
            THREE.MathUtils.radToDeg(activeGizmoRotation.angle),
          360
        );

        return prev[0] === next[0] && prev[1] === next[1] && prev[2] === next[2] ? prev : next;
      });
      lastRotationQuaternionRef.current = quaternionKey;
      return;
    }

    gizmoRotationDraftRef.current = null;

    if (lastRotationQuaternionRef.current === quaternionKey) return;

    setRotationDraft((prev) => {
      const next = quaternionToDegrees(quaternion);
      return prev[0] === next[0] && prev[1] === next[1] && prev[2] === next[2] ? prev : next;
    });
    lastRotationQuaternionRef.current = quaternionKey;
  }, [activeRotationAxis, app, quaternion]);

  const commitPosition = () => {
    if (!app) return;

    const nextPosition = (["x", "y", "z"] as const).map((axis, index) => {
      const parsed = Number.parseFloat(positionDraft[axis]);
      return Number.isFinite(parsed) ? parsed : position[index];
    }) as [number, number, number];

    setActivePositionAxis(null);
    setPositionDraft({
      x: formatNumber(nextPosition[0], 3),
      y: formatNumber(nextPosition[1], 3),
      z: formatNumber(nextPosition[2], 3)
    });
    app.updateEntityTransform(entityId, { position: nextPosition });
  };

  const updateRotation = (axis: Axis, value: number) => {
    if (!app) return;
    const nextRotation = [...rotationDraft] as [number, number, number];
    nextRotation[AXIS_INDEX[axis]] = value;
    setRotationDraft(nextRotation);
    lastRotationQuaternionRef.current = degreesToQuaternion(nextRotation)
      .map((component) => component.toFixed(6))
      .join(",");
    app.updateEntityTransform(entityId, {
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
    if (!app) return;
    const nextScale = [...scaleValues] as [number, number, number];
    const axisIndex = AXIS_INDEX[axis];

    if (isUniformScaleEnabled) {
      const baseValue = scaleValues[axisIndex];
      if (Math.abs(baseValue) < 1e-6) {
        nextScale[0] = value;
        nextScale[1] = value;
        nextScale[2] = value;
      } else {
        const ratio = value / baseValue;
        nextScale[0] = Number((scaleValues[0] * ratio).toFixed(4));
        nextScale[1] = Number((scaleValues[1] * ratio).toFixed(4));
        nextScale[2] = Number((scaleValues[2] * ratio).toFixed(4));
      }
    } else {
      nextScale[axisIndex] = value;
    }

    app.updateEntityTransform(entityId, { scale: nextScale });
  };

  const nudgePosition = (axis: Axis, delta: number) => {
    if (!app) return;
    const index = AXIS_INDEX[axis];
    const baseValue = Number.parseFloat(positionDraft[axis]);
    const nextValue = (Number.isFinite(baseValue) ? baseValue : position[index]) + delta;
    const nextPosition = [...position] as [number, number, number];
    nextPosition[index] = Number(nextValue.toFixed(3));
    setPositionDraft({
      x: formatNumber(nextPosition[0], 3),
      y: formatNumber(nextPosition[1], 3),
      z: formatNumber(nextPosition[2], 3)
    });
    app.updateEntityTransform(entityId, { position: nextPosition });
  };

  return (
    <PropertyPanelSection title={t("editor.properties.transform")}>
      <AxisNumberInputs
        label={t("editor.properties.position")}
        values={positionDraft}
        onFocus={setActivePositionAxis}
        onChange={(axis, value) =>
          setPositionDraft((prev) => ({
            ...prev,
            [axis]: value
          }))
        }
        onCommit={commitPosition}
        onNudge={nudgePosition}
      />

      <AxisSliderGroup
        label={t("editor.properties.rotation")}
        values={rotationDraft}
        min={0}
        max={360}
        step={1}
        formatter={formatDegrees}
        onChangeStart={setActiveRotationAxis}
        onChange={updateRotation}
        onChangeCommit={commitRotation}
      />

      <Stack spacing={0.65}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography sx={{ fontSize: 11, color: theme.text }}>
            {t("editor.properties.scale")}
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={isUniformScaleEnabled}
                onChange={(event) => setIsUniformScaleEnabled(event.target.checked)}
              />
            }
            label={t("editor.properties.uniformScale")}
            sx={{
              mr: 0,
              gap: 0.35,
              "& .MuiFormControlLabel-label": {
                fontSize: 11,
                color: theme.text
              },
              "& .MuiCheckbox-root": {
                p: 0.25,
                color: theme.titleText
              }
            }}
          />
        </Stack>
        <AxisSliderGroup
          label=""
          values={scaleValues}
          min={0}
          max={10}
          step={0.1}
          formatter={(value) => formatNumber(value, 1)}
          onChange={updateScale}
        />
      </Stack>
    </PropertyPanelSection>
  );
}
