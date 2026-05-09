"use client";

import { useEffect, useState } from "react";
import { listPolyhavenAssets, listPolyhavenCategories } from "@/frontend/api/externalAssets";
import type {
  ExternalAssetCategoryOption,
  ExternalAssetListItem,
  ExternalAssetType
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
  const [isListLoading, setIsListLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    setErrorMessage(null);
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
      })
      .catch((error: unknown) => {
        if (disposed) {
          return;
        }

        setAssets([]);
        setTotal(0);
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

  const submitSearch = () => {
    setPage(1);
    setQuery(queryInput.trim());
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    assets,
    categories,
    isListLoading,
    errorMessage,
    setErrorMessage,
    queryInput,
    setQueryInput,
    category,
    setCategory,
    page,
    setPage,
    pageCount,
    submitSearch
  };
}
