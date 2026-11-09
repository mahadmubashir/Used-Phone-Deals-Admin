"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { LoginScreen } from "./login-screen";

/**
 * Nothing in the portal renders until the session resolves.
 *
 * This is presentation, not security: every endpoint checks the caller's role
 * server-side, which is where access separation is actually enforced. The gate
 * exists so staff are not shown an empty shell that fails on every request.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready, hydrate } = useSession();

  React.useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;
  return <>{children}</>;
}
