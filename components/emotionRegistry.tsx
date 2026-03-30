"use client";

import createCache from "@emotion/cache";
import { CacheProvider, type EmotionCache } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";
import { PropsWithChildren, useState } from "react";

type EmotionRegistryState = {
  cache: EmotionCache;
  flush: () => string[];
};

export default function EmotionRegistry({ children }: PropsWithChildren) {
  const [{ cache, flush }] = useState<EmotionRegistryState>(() => {
    const cache = createCache({ key: "css" });
    cache.compat = true;

    const insert = cache.insert;
    let insertedNames: string[] = [];

    cache.insert = (...args: Parameters<EmotionCache["insert"]>) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        insertedNames.push(serialized.name);
      }
      return insert(...args);
    };

    const flush = () => {
      const names = insertedNames;
      insertedNames = [];
      return names;
    };

    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) {
      return null;
    }

    let styles = "";
    for (const name of names) {
      styles += cache.inserted[name];
    }

    return (
      <style
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
