import { Component, type ReactNode, type ErrorInfo } from "react";

// N243 — catches render errors anywhere in the tree and reports them to the
// debug log via `report` (each client supplies how a log reaches the master),
// then shows a minimal fallback. Without this, React swallows render errors in
// production with no trace.

interface Props {
  children: ReactNode;
  report: (log: { type: "error"; message: string; data?: unknown }) => void;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    try {
      this.props.report({
        type: "error",
        message: error.message || "render error",
        data: {
          componentStack: info.componentStack,
          url: typeof location !== "undefined" ? location.href : "",
        },
      });
    } catch {
      /* the error boundary must never throw */
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
          Something went wrong. The error was logged.
        </div>
      );
    }
    return this.props.children;
  }
}
