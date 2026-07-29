import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';

interface Props { children: ReactNode }
interface State { hasError: boolean; message?: string }

/**
 * Scoped to a single routed page's content (see AppLayout.tsx, wraps just
 * <Outlet />) rather than the whole app -- a crash in one page's render
 * previously took down the persistent chrome (TopBar/sidebar/nav) along
 * with it, via the single app-wide AppErrorBoundary in App.tsx. That one
 * still exists as a last-resort fallback for crashes outside routed content
 * (e.g. AppLayout itself).
 *
 * Remounts automatically on navigation: AppLayout renders this inside a div
 * keyed by location.pathname, so React tears down and recreates this whole
 * subtree (including its error state) on route change, without needing a
 * manual "reset" affordance.
 */
export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    Sentry.captureException(err, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[50vh] gap-4 text-gray-600">
          <p className="text-lg font-medium">This page hit an error.</p>
          <p className="text-sm text-gray-400">{this.state.message}</p>
          <button
            className="px-4 py-2 rounded bg-indigo-600 text-white text-sm"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
