import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // Log to analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: true
      });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="text-red-500" size={32} />
                <CardTitle>Oops! Something went wrong</CardTitle>
              </div>
              <CardDescription>
                FUD Buddy encountered an unexpected error
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm font-mono text-red-700 dark:text-red-400 break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't worry! Your privacy data is still safe in your browser.
                You can try refreshing the page or clearing your browser data.
              </p>

              <div className="flex flex-col gap-2">
                <Button onClick={this.handleReset} className="w-full">
                  Refresh Page
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full"
                >
                  Clear Data & Refresh
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                If this problem persists, please{' '}
                <a
                  href="https://github.com/M0nkeyFl0wer/fud-buddy/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  report it on GitHub
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
