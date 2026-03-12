import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          background: "#0e0f16",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
          <div style={{ textAlign: "center", padding: "24px" }}>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "16px", marginBottom: "16px" }}>
              Something went wrong. Please try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#c9a44a",
                color: "#0e0f16",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
