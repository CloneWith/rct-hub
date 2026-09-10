"use client";

/**
 * MatchSectionErrorBoundary — isolates board/pool/info sections so one
 * rendering crash never takes down the whole match page (roadmap §3.8).
 * Errors are logged locally; a retry remounts the section children.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class MatchSectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[match:${this.props.name}] render error`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          <span>此区域渲染出现异常</span>
          <button
            className="rounded-md border border-border px-3 py-1 text-xs text-foreground hover:bg-muted"
            onClick={() => this.setState({ hasError: false })}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
