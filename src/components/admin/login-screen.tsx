"use client";

import * as React from "react";
import { Loader2, ShieldCheck, KeyRound, Copy, Check } from "lucide-react";
import QRCode from "qrcode";
import * as api from "@/lib/auth/admin-api";
import type { StaffUser } from "@/lib/auth/admin-api";
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
  const [enrolQr, setEnrolQr] = React.useState<string | null>(null);
  const [useRecovery, setUseRecovery] = React.useState(false);
  const [recoveryCode, setRecoveryCode] = React.useState("");
  // Shown once, after a first enrolment. The only way back in without the
  // authenticator device, so the user cannot be moved on until they confirm
  // they have saved them.
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[] | null>(null);
  const [pendingUser, setPendingUser] = React.useState<StaffUser | null>(null);
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
          // A QR code is how people actually enrol; the typed key is the
          // fallback for a device that cannot scan.
          if (setup.otpauthUrl) {
            setEnrolQr(
              await QRCode.toDataURL(setup.otpauthUrl, { margin: 1, width: 220 }).catch(() => ""),
            );
          }
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
      const result = await api.mfaVerify(
        challenge,
        useRecovery ? { recoveryCode: recoveryCode.trim() } : { code },
      );
      // A first enrolment hands back recovery codes. Hold the session until
      // the user has seen and acknowledged them — they are shown once.
      if (result.recoveryCodes?.length) {
        setPendingUser(result.user);
        setRecoveryCodes(result.recoveryCodes);
        setBusy(false);
        return;
      }
      setUser(result.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
      setBusy(false);
    }
  }

  const field =
    "h-11 rounded-lg border bg-surface px-3.5 text-base focus:outline-none focus:ring-2 focus:ring-ring/30 sm:text-sm";

  // Shown once, immediately after a first enrolment, before the session is
  // handed over. These codes are the only way back in without the
  // authenticator device, and the API will never show them again.
  if (recoveryCodes) {
    return <RecoveryCodes codes={recoveryCodes} onDone={() => pendingUser && setUser(pendingUser)} />;
  }

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

              {enrolSecret && !useRecovery && (
                <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface-inset p-4">
                  {enrolQr ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={enrolQr}
                        alt="QR code to add this account to your authenticator app"
                        className="rounded-lg bg-white p-2"
                        width={220}
                        height={220}
                      />
                      <p className="text-center text-xs text-fg-muted">
                        Scan with Google Authenticator, Authy, 1Password or similar.
                      </p>
                    </>
                  ) : null}
                  <details className="w-full">
                    <summary className="cursor-pointer text-xs font-semibold text-fg-muted">
                      Can&apos;t scan? Enter the key by hand
                    </summary>
                    <p className="measure mt-2 break-all text-sm">{enrolSecret}</p>
                  </details>
                </div>
              )}

              {useRecovery ? (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="recoveryCode" className="text-xs font-semibold text-fg-muted">
                    Recovery code
                  </label>
                  <input
                    id="recoveryCode"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder="One of the codes you saved"
                    className={cn(field, "measure border-border focus:border-primary")}
                  />
                  <p className="text-xs text-fg-subtle">Each code works once.</p>
                </div>
              ) : (
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
              )}

              {/* Enrolling has no codes to fall back on yet. */}
              {!enrolSecret && (
                <button
                  type="button"
                  onClick={() => {
                    setUseRecovery((v) => !v);
                    setError(null);
                  }}
                  className="focus-ring self-start rounded-md text-xs font-semibold text-primary hover:underline"
                >
                  {useRecovery ? "Use my authenticator instead" : "Lost your phone? Use a recovery code"}
                </button>
              )}
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

/**
 * The recovery codes, shown once.
 *
 * Deliberately a wall rather than a dismissible notice: a user who clicks past
 * this and later loses their phone has no way into their account, and an
 * administrator has to clear their enrolment by hand. Making them confirm they
 * have saved the codes is worth the friction.
 */
function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be refused; the codes are on screen to copy by hand.
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-panel border border-border bg-card p-6">
        <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
          <KeyRound className="size-5" />
        </span>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">
          Save your recovery codes
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Two-factor authentication is on. If you ever lose the device with your authenticator,
          one of these gets you back in. Each works once, and this is the only time they are
          shown.
        </p>

        <ul className="measure mt-4 grid grid-cols-2 gap-2 rounded-card border border-border bg-surface-inset p-4 text-sm">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copy}
            className="focus-ring inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-inset"
          >
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy all"}
          </button>
        </div>

        <label className="mt-5 flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>I have saved these somewhere safe.</span>
        </label>

        <button
          type="button"
          disabled={!confirmed}
          onClick={onDone}
          className="focus-ring mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          Continue to the portal
        </button>
      </div>
    </div>
  );
}
