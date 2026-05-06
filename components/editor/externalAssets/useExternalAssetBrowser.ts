"use client";

import { useEffect, useMemo, useState } from "react";
import { getPolyhavenAssetDetail, listPolyhavenAssets, listPolyhavenCategories } from "@/frontend/api/externalAssets";
import {
  getPreferredHdriFormat,
  getPreferredHdriResolution,
  getPreferredTextureResolution
} from "@/lib/externalAssets/source";
import type {
  ExternalAssetCategoryOption,
  ExternalAssetDetail,
  ExternalAssetListItem,
  ExternalAssetType,
  ExternalHdriAssetDetail,
  ExternalTextureAssetDetail
} from "@/lib/externalAssets/types";
import { getApiErrorMessage } from "@/lib/http/axios";
import { useI18n } from "@/lib/i18n";

const PAGE_SIZE = 24;

type UseExternalAssetBrowserArgs = {
  open: boolean;
  assetType: ExternalAssetType;
};

export function useExternalAssetBrowser({ open, assetType }: UseExternalAssetBrowserArgs) {
  const { t } = useI18n();
  const [assets, setAssets] = useState<ExternalAssetListItem[]>([]);
  const [categories, setCategories] = useState<ExternalAssetCategoryOption[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<ExternalAssetDetail | null>(null);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedResolution, setSelectedResolution] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setErrorMessage(null);
    setSelectedAssetDetail(null);
    setSelectedAssetId(null);
    setSelectedResolution("");
    setSelectedFormat("");
    setQueryInput("");
    setQuery("");
    setCategory("");
    setPage(1);
  }, [open, assetType]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let disposed = false;
    setIsListLoading(true);
    setErrorMessage(null);

    void listPolyhavenAssets({
      assetType,
      page,
      pageSize: PAGE_SIZE,
      query,
      category
    })
      .then((response) => {
        if (disposed) {
          return;
        }

        setAssets(response.items);
        setTotal(response.total);
        setSelectedAssetId((current) => {
          if (current && response.items.some((item) => item.assetId === current)) {
            return current;
          }

          return response.items[0]?.assetId ?? null;
        });
      })
      .catch((error: unknown) => {
        if (disposed) {
          return;
        }

        setAssets([]);
        setTotal(0);
        setSelectedAssetId(null);
        setErrorMessage(getApiErrorMessage(error, t("editor.assets.loadFailed")));
      })
      .finally(() => {
        if (!disposed) {
          setIsListLoading(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [assetType, category, open, page, query, t]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let disposed = false;

    void listPolyhavenCategories(assetType)
      .then((response) => {
        if (!disposed) {
          setCategories(response);
        }
      })
      .catch(() => {
        if (!disposed) {
          setCategories([]);
        }
      });

    return () => {
      disposed = true;
    };
  }, [assetType, open]);

  useEffect(() => {
    if (!open || !selectedAssetId) {
      setSelectedAssetDetail(null);
      return;
    }

    let disposed = false;
    setIsDetailLoading(true);
    setErrorMessage(null);

    void getPolyhavenAssetDetail(selectedAssetId, assetType)
      .then((response) => {
        if (disposed) {
          return;
        }

        setSelectedAssetDetail(response);
      })
      .catch((error: unknown) => {
        if (disposed) {
          return;
        }

        setSelectedAssetDetail(null);
        setErrorMessage(getApiErrorMessage(error, t("editor.assets.detailLoadFailed")));
      })
      .finally(() => {
        if (!disposed) {
          setIsDetailLoading(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [assetType, open, selectedAssetId, t]);

  useEffect(() => {
    if (!selectedAssetDetail) {
      setSelectedResolution("");
      setSelectedFormat("");
      return;
    }

    if (selectedAssetDetail.assetType === "hdri") {
      const nextResolution = getPreferredHdriResolution(selectedAssetDetail.fileOptions);
      const nextFormat = getPreferredHdriFormat(selectedAssetDetail.fileOptions, nextResolution);
      setSelectedResolution(nextResolution);
      setSelectedFormat(nextFormat);
      return;
    }

    setSelectedResolution(getPreferredTextureResolution(selectedAssetDetail));
    setSelectedFormat("");
  }, [selectedAssetDetail]);

  useEffect(() => {
    if (!selectedAssetDetail || selectedAssetDetail.assetType !== "hdri" || !selectedResolution) {
      return;
    }

    const availableFormats = Array.from(
      new Set(
        selectedAssetDetail.fileOptions
          .filter((file) => file.resolution === selectedResolution)
          .map((file) => file.format)
      )
    );

    if (availableFormats.length === 0) {
      setSelectedFormat("");
      return;
    }

    if (availableFormats.includes(selectedFormat)) {
      return;
    }

    setSelectedFormat(getPreferredHdriFormat(selectedAssetDetail.fileOptions, selectedResolution));
  }, [selectedAssetDetail, selectedFormat, selectedResolution]);

  const submitSearch = () => {
    setPage(1);
    setQuery(queryInput.trim());
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hdriDetail = useMemo<ExternalHdriAssetDetail | null>(
    () => (selectedAssetDetail?.assetType === "hdri" ? selectedAssetDetail : null),
    [selectedAssetDetail]
  );
  const textureDetail = useMemo<ExternalTextureAssetDetail | null>(
    () => (selectedAssetDetail?.assetType === "texture" ? selectedAssetDetail : null),
    [selectedAssetDetail]
  );

  return {
    assets,
    categories,
    selectedAssetId,
    setSelectedAssetId,
    selectedAssetDetail,
    isListLoading,
    isDetailLoading,
    errorMessage,
    setErrorMessage,
    queryInput,
    setQueryInput,
    category,
    setCategory,
    page,
    setPage,
    pageCount,
    selectedResolution,
    setSelectedResolution,
    selectedFormat,
    setSelectedFormat,
    submitSearch,
    hdriDetail,
    textureDetail
  };
}
