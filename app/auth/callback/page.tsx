"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@heroui/react";
import { useAuth } from "@/app/context/AuthContext";

/** Inner component — needs useSearchParams which must be inside Suspense. */
function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) return;

    login(token).then(() => {
      // Redirect to home after a brief moment for state to settle
      router.replace("/");
    });
  }, [token, login, router]);

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center">
          <span className="text-danger text-2xl font-bold">!</span>
        </div>
        <h1 className="text-xl font-semibold">Authentication Failed</h1>
        <p className="text-muted-foreground">No token received from OAuth callback.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <Spinner size="lg" color="accent" />
      <div className="text-center">
        <h1 className="text-xl font-semibold">Logging you in...</h1>
        <p className="text-muted-foreground mt-1">
          Verifying your osu! account and setting up your session.
        </p>
      </div>
    </div>
  );
}

/** Full page with Suspense boundary for useSearchParams. */
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-6">
          <Spinner size="lg" color="accent" />
          <h1 className="text-xl font-semibold">Loading...</h1>
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
