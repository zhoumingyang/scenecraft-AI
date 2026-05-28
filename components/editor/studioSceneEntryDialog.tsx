"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import {
  STUDIO_PRODUCT_MATERIALS,
  STUDIO_PRODUCT_TYPES,
  type StudioProductMaterial,
  type StudioProductProfile,
  type StudioProductType
} from "@/render/editor";
import { useI18n, type TranslationKey } from "@/lib/i18n";

type StudioSceneEntryDialogProps = {
  open: boolean;
  initialProfile: StudioProductProfile | null;
  onClose: () => void;
  onConfirm: (profile: StudioProductProfile) => void;
};

const productLabelKeys: Record<StudioProductType, TranslationKey> = {
  generic: "editor.studioScene.product.generic",
  tech: "editor.studioScene.product.tech",
  beauty: "editor.studioScene.product.beauty",
  jewelry: "editor.studioScene.product.jewelry",
  fashion: "editor.studioScene.product.fashion",
  footwear: "editor.studioScene.product.footwear",
  food: "editor.studioScene.product.food",
  home: "editor.studioScene.product.home",
  furniture: "editor.studioScene.product.furniture",
  toy: "editor.studioScene.product.toy"
};

const materialLabelKeys: Record<StudioProductMaterial, TranslationKey> = {
  unknown: "editor.studioScene.material.unknown",
  matte: "editor.studioScene.material.matte",
  glossy: "editor.studioScene.material.glossy",
  metallic: "editor.studioScene.material.metallic",
  glass: "editor.studioScene.material.glass",
  plastic: "editor.studioScene.material.plastic",
  fabric: "editor.studioScene.material.fabric",
  leather: "editor.studioScene.material.leather",
  ceramic: "editor.studioScene.material.ceramic",
  wood: "editor.studioScene.material.wood",
  mixed: "editor.studioScene.material.mixed"
};

const FALLBACK_PROFILE: StudioProductProfile = {
  productType: "generic",
  material: "unknown",
  brandColor: null
};

function normalizeBrandColor(value: string) {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toLowerCase() : "";
}

export default function StudioSceneEntryDialog({
  open,
  initialProfile,
  onClose,
  onConfirm
}: StudioSceneEntryDialogProps) {
  const { t } = useI18n();
  const resolvedInitialProfile = useMemo(
    () => initialProfile ?? FALLBACK_PROFILE,
    [initialProfile]
  );
  const [productType, setProductType] = useState<StudioProductType>(resolvedInitialProfile.productType);
  const [material, setMaterial] = useState<StudioProductMaterial>(resolvedInitialProfile.material);
  const [brandColor, setBrandColor] = useState(resolvedInitialProfile.brandColor ?? "");

  useEffect(() => {
    if (!open) return;
    setProductType(resolvedInitialProfile.productType);
    setMaterial(resolvedInitialProfile.material);
    setBrandColor(resolvedInitialProfile.brandColor ?? "");
  }, [open, resolvedInitialProfile]);

  const normalizedBrandColor = normalizeBrandColor(brandColor);
  const hasInvalidBrandColor = brandColor.trim().length > 0 && !normalizedBrandColor;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t("editor.studioScene.entry.title")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            {t("editor.studioScene.entry.description")}
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel>{t("editor.studioScene.entry.productType")}</InputLabel>
            <Select
              label={t("editor.studioScene.entry.productType")}
              value={productType}
              onChange={(event) => setProductType(event.target.value as StudioProductType)}
            >
              {STUDIO_PRODUCT_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {t(productLabelKeys[type])}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>{t("editor.studioScene.entry.material")}</InputLabel>
            <Select
              label={t("editor.studioScene.entry.material")}
              value={material}
              onChange={(event) => setMaterial(event.target.value as StudioProductMaterial)}
            >
              {STUDIO_PRODUCT_MATERIALS.map((item) => (
                <MenuItem key={item} value={item}>
                  {t(materialLabelKeys[item])}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack spacing={0.75}>
            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
              {t("editor.studioScene.entry.brandColor")}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                component="input"
                type="color"
                value={normalizedBrandColor || "#d9e8ff"}
                onChange={(event) => setBrandColor(event.target.value)}
                sx={{
                  width: 42,
                  height: 34,
                  p: 0,
                  border: "1px solid rgba(127,142,168,0.45)",
                  borderRadius: 1,
                  background: "transparent",
                  cursor: "pointer"
                }}
              />
              <TextField
                fullWidth
                size="small"
                value={brandColor}
                placeholder="#d9e8ff"
                error={hasInvalidBrandColor}
                helperText={hasInvalidBrandColor ? t("editor.studioScene.entry.brandColorError") : " "}
                onChange={(event) => setBrandColor(event.target.value)}
              />
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("editor.project.cancel")}</Button>
        <Button
          variant="contained"
          disabled={hasInvalidBrandColor}
          onClick={() => {
            onConfirm({
              productType,
              material,
              brandColor: normalizedBrandColor || null
            });
          }}
        >
          {t("editor.studioScene.entry.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
