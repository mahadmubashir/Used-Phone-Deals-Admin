import * as React from 'react';
import { Button } from '@/shared';

interface State {
  error: Error | null;
}

/**
 * Global error boundary. React has no hook equivalent for this, so it stays a
 * class component.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Wire this to the error reporting service once one is provisioned.
    console.error('Unhandled portal error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6 text-red-700">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </span>

          <h1 className="mt-5 text-lg font-semibold text-slate-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-600">
            The portal hit an unexpected problem. Reloading usually clears it. If it keeps happening,
            send this message to your developer:
          </p>
          <p className="mt-3 break-words rounded-lg bg-slate-50 px-3 py-2 text-left font-mono text-xs text-slate-700">
            {this.state.error.message}
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => this.setState({ error: null })}>Try again</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload the portal
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
