'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for child-safe error handling.
 * Catches JavaScript errors anywhere in the child component tree,
 * logs them, and displays a friendly fallback UI instead of crashing.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // In production, you would send this to an error tracking service
    // logErrorToService(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gradient-to-br from-cream to-white">
          <div className="max-w-md">
            {/* Friendly illustration */}
            <div className="text-6xl mb-6">🌈</div>

            <h1 className="text-2xl font-bold text-navy mb-4 font-display">
              Oops! Something went wrong
            </h1>

            <p className="text-gray-600 mb-6 text-lg">
              Don&apos;t worry! Let&apos;s try again together.
            </p>

            <button
              onClick={this.handleRetry}
              className="px-8 py-4 bg-gradient-to-r from-teal to-teal-light text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Try Again 🎯
            </button>

            <p className="mt-6 text-sm text-gray-400">
              If this keeps happening, please refresh the page.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
