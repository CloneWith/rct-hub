"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import { useAuth } from "@/app/context/AuthContext";

/**
 * OAuth callback page.
 *
 * The backend sets the session cookie and redirects here without any token
 * parameter. We verify the session by fetching the current user; a
 * successful response means the cookie is valid and we can proceed.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    login().then((ok) => {
      if (cancelled) return;
      if (ok) {
        router.replace("/");
      } else {
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [login, router]);

  if (failed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center">
          <span className="text-danger text-2xl font-bold">!</span>
        </div>
        <h1 className="text-xl font-semibold">Authentication Failed</h1>
        <p className="text-muted-foreground">
          No valid session was established. Please try logging in again.
        </p>
        <Link href="/" className="text-primary underline underline-offset-4">
          Back to home
        </Link>
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
