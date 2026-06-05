import { useEffect, useMemo, useRef, useState } from "react";
import { getPolyhavenAssetDetail } from "@/frontend/api/externalAssets";
import type {
  ExternalAssetDetail,
  ExternalAssetListItem,
  ExternalAssetType
} from "@/lib/externalAssets/types";
import { getApiErrorMessage } from "@/lib/http/axios";
import {
  DETAIL_CACHE_LIMIT,
  getAvailableFormats,
  getAvailableResolutions,
  getDetailCacheKey,
  getPreferredFormatForResolution,
  getPreferredSelection
} from "./externalAssetSelection";
import { createLruCache } from "./lruCache";

export function useExternalAssetDetailSelection({
  assetType,
  assets,
  isApplying,
  open,
  t
}: {
  assetType: ExternalAssetType;
  assets: ExternalAssetListItem[];
  isApplying: boolean;
  open: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<ExternalAssetDetail | null>(null);
  const [selectedDetailError, setSelectedDetailError] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const detailCacheRef = useRef(
    createLruCache<string, ExternalAssetDetail>({
      maxSize: DETAIL_CACHE_LIMIT
    })
  );
  const detailRequestId = useRef(0);

  const resetSelection = () => {
    setSelectedAssetId(null);
    setSelectedAssetDetail(null);
    setSelectedDetailError(null);
    setIsDetailLoading(false);
    setIsDetailOpen(false);
    setSelectedResolution("");
    setSelectedFormat("");
    detailRequestId.current += 1;
  };

  useEffect(() => {
    if (!open) {
      resetSelection();
    }
  }, [open]);

  useEffect(() => {
    resetSelection();
  }, [assetType]);

  useEffect(() => {
    if (!selectedAssetId || assets.some((item) => item.assetId === selectedAssetId)) {
      return;
    }

    resetSelection();
  }, [assets, selectedAssetId]);

  const selectedAvailableResolutions = useMemo(
    () => getAvailableResolutions(selectedAssetDetail),
    [selectedAssetDetail]
  );
  const selectedAvailableFormats = useMemo(
    () => getAvailableFormats(selectedAssetDetail, selectedResolution),
    [selectedAssetDetail, selectedResolution]
  );

  useEffect(() => {
    if (!selectedAssetDetail || !selectedResolution) {
      return;
    }

    const availableFormats = getAvailableFormats(selectedAssetDetail, selectedResolution);
    if (availableFormats.length === 0) {
      if (selectedFormat !== "") {
        setSelectedFormat("");
      }
      return;
    }

    if (availableFormats.includes(selectedFormat)) {
      return;
    }

    setSelectedFormat(
      getPreferredFormatForResolution(selectedAssetDetail, selectedResolution, availableFormats)
    );
  }, [selectedAssetDetail, selectedFormat, selectedResolution]);

  const applyDetailSelection = (detail: ExternalAssetDetail) => {
    const nextSelection = getPreferredSelection(detail);
    setSelectedAssetDetail(detail);
    setSelectedResolution(nextSelection.resolution);
    setSelectedFormat(nextSelection.format);
  };

  const handleSelectAsset = (item: ExternalAssetListItem) => {
    if (isApplying) {
      return;
    }

    if (selectedAssetId === item.assetId && (selectedAssetDetail || isDetailLoading)) {
      return;
    }

    setSelectedAssetId(item.assetId);
    setSelectedAssetDetail(null);
    setSelectedDetailError(null);
    setIsDetailOpen(false);
    setSelectedResolution("");
    setSelectedFormat("");

    const cacheKey = getDetailCacheKey(item.assetType, item.assetId);
    const cachedDetail = detailCacheRef.current.get(cacheKey);
    if (cachedDetail) {
      detailRequestId.current += 1;
      setIsDetailLoading(false);
      applyDetailSelection(cachedDetail);
      return;
    }

    const requestId = detailRequestId.current + 1;
    detailRequestId.current = requestId;
    setIsDetailLoading(true);

    void getPolyhavenAssetDetail(item.assetId, item.assetType)
      .then((detail) => {
        if (detailRequestId.current !== requestId) {
          return;
        }

        detailCacheRef.current.set(cacheKey, detail);
        applyDetailSelection(detail);
      })
      .catch((error: unknown) => {
        if (detailRequestId.current !== requestId) {
          return;
        }

        setSelectedDetailError(getApiErrorMessage(error, t("editor.assets.detailLoadFailed")));
      })
      .finally(() => {
        if (detailRequestId.current === requestId) {
          setIsDetailLoading(false);
        }
      });
  };

  return {
    handleSelectAsset,
    isDetailLoading,
    isDetailOpen,
    selectedAssetDetail,
    selectedAssetId,
    selectedAvailableFormats,
    selectedAvailableResolutions,
    selectedDetailError,
    selectedFormat,
    selectedResolution,
    setIsDetailOpen,
    setSelectedFormat,
    setSelectedResolution
  };
}
