import * as React from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button, Field, Input, errorMessage, validateEmail } from '@/shared';
import { api, endpoints } from '@/lib/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();

  const mutation = useMutation({
    mutationFn: () => api.post(endpoints.auth.forgotPassword, { email }),
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validateEmail(email);
    setError(validationError);
    if (validationError) return;
    mutation.mutate();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900">
          Reset your password
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          We&apos;ll email you a link to set a new one.
        </p>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {mutation.isSuccess ? (
            <div role="status" className="rounded-lg bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
              <p className="font-medium">Check your inbox</p>
              <p className="mt-1">
                If an account exists for {email}, a reset link is on its way. It expires in one hour.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              {mutation.isError && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">
                  {errorMessage(mutation.error)}
                </p>
              )}

              <Field id="email" label="Email address" required error={error}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  invalid={Boolean(error)}
                />
              </Field>

              <Button type="submit" size="lg" fullWidth loading={mutation.isPending}>
                Send reset link
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
