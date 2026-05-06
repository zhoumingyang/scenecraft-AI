"use client";
import type { ReactNode } from "react";
import {
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Slider,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import { useI18n } from "@/lib/i18n";
import type { ExternalAssetSourceJSON } from "@/lib/externalAssets/types";
import type { ModelAnimationClipJSON, ModelAnimationPlaybackState } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";

type ModelAnimationSectionProps = {
  entityId: string;
  animations: ModelAnimationClipJSON[];
  activeAnimationId: string | null;
  timeScale: number;
  playbackState: ModelAnimationPlaybackState;
  externalSource?: ExternalAssetSourceJSON | null;
};

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0.0s";
  return `${seconds.toFixed(1)}s`;
}

function PlaybackStateIcon({ playbackState }: { playbackState: ModelAnimationPlaybackState }) {
  const sx = { fontSize: 14, color: "rgba(150,182,255,0.9)" };
  if (playbackState === "playing") {
    return <PlayArrowRoundedIcon sx={sx} />;
  }
  if (playbackState === "paused") {
    return <PauseRoundedIcon sx={sx} />;
  }
  return <StopRoundedIcon sx={sx} />;
}

export function ModelAnimationSection({
  entityId,
  animations,
  activeAnimationId,
  timeScale,
  playbackState,
  externalSource
}: ModelAnimationSectionProps) {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);
  const controls: Array<{
    key: "play" | "pause" | "stop" | "step";
    icon: ReactNode;
    active: boolean;
  }> = [
    {
      key: "play",
      icon: <PlayArrowRoundedIcon sx={{ fontSize: 16 }} />,
      active: playbackState === "playing"
    },
    {
      key: "pause",
      icon: <PauseRoundedIcon sx={{ fontSize: 16 }} />,
      active: playbackState === "paused"
    },
    {
      key: "stop",
      icon: <StopRoundedIcon sx={{ fontSize: 16 }} />,
      active: playbackState === "stopped"
    },
    {
      key: "step",
      icon: <SkipNextRoundedIcon sx={{ fontSize: 16 }} />,
      active: false
    }
  ];

  if (animations.length === 0) {
    return (
      <PropertyPanelSection title={t("editor.properties.animation")}>
        <Stack spacing={0.8}>
          {externalSource ? (
            <Stack spacing={0.35}>
              <Typography sx={{ fontSize: 11, color: "rgba(176,193,228,0.72)" }}>
                {t("editor.assets.sourceLine", {
                  provider: "Poly Haven",
                  license: externalSource.licenseLabel
                })}
              </Typography>
              <Box
                component="a"
                href={externalSource.pageUrl}
                target="_blank"
                rel="noreferrer"
                sx={{
                  fontSize: 11,
                  color: "#dce7ff",
                  textDecoration: "underline"
                }}
              >
                {t("editor.assets.viewSource")}
              </Box>
            </Stack>
          ) : null}

          <Typography sx={{ fontSize: 12, color: "rgba(176,193,228,0.72)" }}>
            {t("editor.properties.animationEmpty")}
          </Typography>
        </Stack>
      </PropertyPanelSection>
    );
  }

  return (
    <PropertyPanelSection title={t("editor.properties.animation")}>
      <Stack spacing={1.05}>
        {externalSource ? (
          <Stack spacing={0.35}>
            <Typography sx={{ fontSize: 11, color: "rgba(176,193,228,0.72)" }}>
              {t("editor.assets.sourceLine", {
                provider: "Poly Haven",
                license: externalSource.licenseLabel
              })}
            </Typography>
            <Box
              component="a"
              href={externalSource.pageUrl}
              target="_blank"
              rel="noreferrer"
              sx={{
                fontSize: 11,
                color: "#dce7ff",
                textDecoration: "underline"
              }}
            >
              {t("editor.assets.viewSource")}
            </Box>
          </Stack>
        ) : null}

        <Stack direction="row" spacing={0.7}>
          {controls.map((item) => (
            <Tooltip key={item.key} title={t(`editor.properties.animation.${item.key}`)}>
              <IconButton
                size="small"
                onClick={() => app?.controlModelAnimation(entityId, item.key)}
                sx={{
                  flex: 1,
                  color: "rgba(222,234,255,0.92)",
                  border: "1px solid rgba(160,190,255,0.18)",
                  borderRadius: 0.8,
                  background:
                    item.active
                      ? "rgba(120,172,255,0.22)"
                      : "rgba(255,255,255,0.03)"
                }}
              >
                {item.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Stack>

        <Stack spacing={0.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
              {t("editor.properties.animation.timeScale")}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "rgba(227,236,255,0.92)" }}>
              {timeScale.toFixed(2)}x
            </Typography>
          </Stack>
          <Slider
            size="small"
            min={0.1}
            max={4}
            step={0.05}
            value={timeScale}
            onChange={(_, nextValue) =>
              app?.setModelAnimationTimeScale(entityId, nextValue as number)
            }
          />
        </Stack>

        <Box
          sx={{
            borderRadius: 0.8,
            border: "1px solid rgba(160,190,255,0.12)",
            background: "rgba(10,18,38,0.32)",
            overflow: "hidden"
          }}
        >
          <List disablePadding dense>
            {animations.map((animation) => {
              const selected = animation.id === activeAnimationId;
              return (
                <ListItemButton
                  key={animation.id}
                  selected={selected}
                  onClick={() => app?.selectModelAnimation(entityId, animation.id)}
                  sx={{
                    gap: 1,
                    py: 0.55,
                    px: 1,
                    alignItems: "center",
                    borderBottom: "1px solid rgba(160,190,255,0.08)",
                    "&.Mui-selected": {
                      background: "rgba(120,172,255,0.18)"
                    },
                    "&.Mui-selected:hover": {
                      background: "rgba(120,172,255,0.24)"
                    }
                  }}
                >
                  <ListItemText
                    disableTypography
                    primary={
                      <Stack direction="row" spacing={0.9} alignItems="center" justifyContent="space-between">
                        <Typography
                          sx={{
                            minWidth: 0,
                            flex: 1,
                            fontSize: 12,
                            color: "#eef5ff",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                        >
                          {animation.name}
                        </Typography>
                        <Typography
                          sx={{
                            flexShrink: 0,
                            fontSize: 10,
                            color: "rgba(176,193,228,0.72)"
                          }}
                        >
                          {formatDuration(animation.duration)}
                        </Typography>
                      </Stack>
                    }
                  />
                  {selected ? (
                    <PlaybackStateIcon playbackState={playbackState} />
                  ) : null}
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Stack>
    </PropertyPanelSection>
  );
}
