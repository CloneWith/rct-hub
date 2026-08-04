"use client";

import { QueryClient, QueryClientProvider, type QueryClientConfig } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

const defaultOptions: QueryClientConfig["defaultOptions"] = {
  queries: {
    staleTime: 30 * 1000,         // 30s before re-fetch
    gcTime: 5 * 60 * 1000,        // keep in cache 5 min
    retry: 1,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: 0,
  },
};

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
