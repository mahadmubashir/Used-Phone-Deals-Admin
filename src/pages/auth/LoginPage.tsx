import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Field, Input, errorMessage, validateEmail } from '@/shared';
import { useAuth } from '@/stores/auth';
import { landingPathForRole } from '@/layouts/navigation';
import { env } from '@/lib/env';

type Stage = 'credentials' | 'mfa';

/**
 * Single sign-in for all three portal roles.
 *
 * Suppliers must complete an MFA challenge before a session is established;
 * CSR and Super Admin accounts have no MFA in Phase 1. Buyers are rejected
 * outright by the auth store, whatever credentials they present.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verifyMfa, user, sessionEstablished } = useAuth();

  const [stage, setStage] = React.useState<Stage>('credentials');
  const [mfaToken, setMfaToken] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [errors, setErrors] = React.useState<{ email?: string; password?: string; code?: string }>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Already signed in — bounce straight to the right dashboard.
  React.useEffect(() => {
    if (user && sessionEstablished) {
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? landingPathForRole(user.role), { replace: true });
    }
  }, [user, sessionEstablished, navigate, location.state]);

  async function onCredentials(event: React.FormEvent) {
    event.preventDefault();
    const next = {
      email: validateEmail(email),
      password: password ? undefined : 'Password is required',
    };
    setErrors(next);
    if (next.email || next.password) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const response = await login(email, password);
      if (response.mfaRequired) {
        setMfaToken(response.mfaToken ?? '');
        setStage('mfa');
        setSubmitting(false);
        return;
      }
      if (response.user) navigate(landingPathForRole(response.user.role), { replace: true });
    } catch (error) {
      setFormError(errorMessage(error));
      setSubmitting(false);
    }
  }

  async function onMfa(event: React.FormEvent) {
    event.preventDefault();
    if (code.trim().length !== 6) {
      setErrors({ code: 'Enter the 6-digit code' });
      return;
    }
    setErrors({});
    setSubmitting(true);
    setFormError(null);
    try {
      const verified = await verifyMfa(code.trim(), mfaToken);
      navigate(landingPathForRole(verified.role), { replace: true });
    } catch (error) {
      setFormError(errorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-base font-bold text-white">
            UP
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
            {stage === 'credentials' ? 'Portal sign in' : 'Two-factor verification'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {stage === 'credentials'
              ? 'For suppliers, customer service agents and administrators.'
              : 'Enter the 6-digit code from your authenticator app.'}
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {formError && (
            <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">
              {formError}
            </p>
          )}

          {stage === 'credentials' ? (
            <form onSubmit={onCredentials} className="space-y-4" noValidate>
              <Field id="email" label="Email address" required error={errors.email}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  invalid={Boolean(errors.email)}
                />
              </Field>

              <Field id="password" label="Password" required error={errors.password}>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  invalid={Boolean(errors.password)}
                />
              </Field>

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>

              <Button type="submit" size="lg" fullWidth loading={submitting}>
                Sign in
              </Button>
            </form>
          ) : (
            <form onSubmit={onMfa} className="space-y-4" noValidate>
              <Field
                id="code"
                label="Verification code"
                required
                error={errors.code}
                hint="Six digits from your authenticator app."
              >
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                  invalid={Boolean(errors.code)}
                  className="text-center font-mono text-xl tracking-[0.4em]"
                />
              </Field>

              <Button type="submit" size="lg" fullWidth loading={submitting}>
                Verify and continue
              </Button>

              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => {
                  setStage('credentials');
                  setCode('');
                  setFormError(null);
                }}
              >
                Back
              </Button>
            </form>
          )}
        </div>

        {env.useMocks && <MockCredentialsHint stage={stage} />}

        <p className="mt-6 text-center text-xs text-slate-500">
          Buying something?{' '}
          <a href={env.buyerPortalUrl} className="font-medium text-brand-700 hover:underline">
            Go to the main site
          </a>
          .
        </p>
      </div>
    </div>
  );
}

/** Development affordance only — never rendered when USE_MOCKS is false. */
function MockCredentialsHint({ stage }: { stage: Stage }) {
  return (
    <div className="mt-5 rounded-lg border border-slate-200 bg-white/70 p-4 text-xs text-slate-600">
      <p className="font-semibold text-slate-900">Mock mode is on</p>
      {stage === 'credentials' ? (
        <>
          <p className="mt-1">Any password works. The email decides the role:</p>
          <ul className="mt-2 space-y-1 font-mono">
            <li>admin@usedphonedeals.com — Super Admin</li>
            <li>sarah.bennett@usedphonedeals.com — CSR</li>
            <li>supplier@example.co.uk — Supplier (MFA)</li>
          </ul>
        </>
      ) : (
        <p className="mt-1">
          Use code <span className="font-mono font-semibold">123456</span>.
        </p>
      )}
    </div>
  );
}
