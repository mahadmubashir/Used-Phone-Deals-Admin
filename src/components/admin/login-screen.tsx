"use client";

import * as React from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import * as api from "@/lib/auth/admin-api";
import { ApiError } from "@/lib/api/http";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

/**
 * Staff sign-in.
 *
 * Two steps rather than one, because a supplier's password alone does not
 * produce a session: the API answers with a challenge and MFA is mandatory for
 * them. The Super Admin has no MFA in Phase 1 and lands straight in.
 */
export function LoginScreen() {
  const setUser = useSession((s) => s.setUser);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [challenge, setChallenge] = React.useState<string | null>(null);
  const [enrolSecret, setEnrolSecret] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.login(email, password);
      if (res.mfaRequired && res.challengeToken) {
        setChallenge(res.challengeToken);
        // A supplier who has never enrolled needs the secret to add the account
        // to their authenticator first.
        if (!res.mfaEnrolled) {
          const setup = await api.mfaSetup(res.challengeToken);
          setEnrolSecret(
            setup.secret ?? (setup.otpauthUrl ?? "").match(/secret=([A-Z2-7]+)/i)?.[1] ?? null,
          );
        }
      } else if (res.user) {
        setUser(res.user);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      setUser(await api.mfaVerify(challenge, code));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
      setBusy(false);
    }
  }

  const field =
    "h-11 rounded-lg border bg-surface px-3.5 text-base focus:outline-none focus:ring-2 focus:ring-ring/30 sm:text-sm";

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="readout grid-field relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 top-0 size-80 rounded-full bg-primary/25 blur-3xl" aria-hidden />
        <span className="relative flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-[0.7rem] bg-primary font-display text-sm font-bold text-primary-foreground">
            UPD
          </span>
          <span className="font-display text-lg font-bold">UsedPhoneDeals</span>
        </span>
        <div className="relative">
          <h2 className="max-w-sm font-display text-3xl font-bold leading-tight">
            Supplier, service and platform administration.
          </h2>
          <p className="mt-4 max-w-sm text-sm opacity-80">
            Suppliers sign in here too. Their accounts require a second factor
            every time — a password on its own will not open a session.
          </p>
        </div>
        <p className="micro-label relative">Staff access only</p>
      </div>

      <div className="flex items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-sm">
          {!challenge ? (
            <form onSubmit={submitPassword} className="flex flex-col gap-5">
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight">Sign in</h1>
                <p className="mt-1 text-sm text-fg-muted">
                  Use the account your administrator issued.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-fg-muted">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(field, "border-border focus:border-primary")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-fg-muted">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(field, "border-border focus:border-primary")}
                />
              </div>
              {error && (
                <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-70"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {busy ? "Checking…" : "Continue"}
              </button>
            </form>
          ) : (
            <form onSubmit={submitCode} className="flex flex-col gap-5">
              <div>
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" />
                </span>
                <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">
                  Two-factor code
                </h1>
                <p className="mt-1 text-sm text-fg-muted">
                  {enrolSecret
                    ? "Add this account to your authenticator, then enter the code it shows."
                    : "Enter the six-digit code from your authenticator."}
                </p>
              </div>

              {enrolSecret && (
                <div className="rounded-card border border-border bg-surface-inset p-3">
                  <p className="micro-label">Setup key</p>
                  <p className="measure mt-1 break-all text-sm">{enrolSecret}</p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="code" className="text-xs font-semibold text-fg-muted">
                  Authentication code
                </label>
                <input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className={cn(field, "measure border-border tracking-[0.3em] focus:border-primary")}
                />
              </div>
              {error && (
                <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {busy ? "Verifying…" : "Verify and sign in"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
