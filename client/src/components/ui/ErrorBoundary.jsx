import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Render Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--broadcast-bg,#0a0e1a)] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[var(--broadcast-card,#131b2e)] border border-[var(--broadcast-border,#202d4a)] shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-white">Something went wrong</h2>
              <p className="text-xs text-[var(--text-muted,#7e8b9b)] mt-1.5 leading-relaxed">
                An unexpected interface issue occurred. Refreshing the room or returning to the dashboard will get you back in action.
              </p>
              {this.state.error?.message && (
                <div className="mt-3 p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] font-mono text-red-300 text-left overflow-x-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-[var(--gold-primary,#f5a623)] hover:brightness-110 text-black font-bold text-xs flex items-center gap-2 transition shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Room
              </button>
              <a
                href="/"
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 flex items-center gap-2 transition"
              >
                <Home className="w-4 h-4" />
                Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
