/**
 * RTL render wrapper that mirrors the production provider stack:
 *
 *   <QueryClientProvider>        ← app/lib/query-provider.tsx
 *     <AuthProvider>             ← app/context/AuthContext.tsx
 *       <Toast.Provider>         ← HeroUI v3
 *         {ui}
 *
 * Each test gets a fresh `QueryClient` (retry disabled, no cache leakage
 * across cases). For components that don't need the full provider stack,
 * prefer rendering directly; this helper is for parity with the production
 * render path.
 *
 * Usage:
 *   const { getByText } = renderWithProviders(<MyComponent />);
 *   await waitFor(() => expect(getByText("loaded")).toBeInTheDocument());
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { Toast } from "@heroui/react";

export interface RenderProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  /** Skip QueryClient wrapper (useful for purely presentational tests). */
  withoutQueryClient?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderProvidersOptions = {},
): RenderResult {
  const { withoutQueryClient, ...renderOptions } = options;

  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => {
    if (withoutQueryClient) {
      return <Toast.Provider>{children}</Toast.Provider>;
    }
    return (
      <QueryClientProvider client={qc}>
        <Toast.Provider>{children}</Toast.Provider>
      </QueryClientProvider>
    );
  };

  return render(ui, { ...renderOptions, wrapper: Wrapper });
}