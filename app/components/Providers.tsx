"use client";

import { Toast } from "@heroui/react";
import { QueryProvider } from "@/app/lib/query-provider";
import { AuthProvider } from "@/app/context/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
        <Toast.Provider placement="bottom end" />
      </AuthProvider>
    </QueryProvider>
  );
}
