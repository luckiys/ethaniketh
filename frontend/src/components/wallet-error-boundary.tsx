'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class WalletErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('WalletConnect error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-zinc-500">Wallet unavailable</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="text-xs text-zinc-400 hover:text-zinc-300 underline"
            >
              Retry
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
