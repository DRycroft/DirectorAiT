import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logError } from '@/lib/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorType: 'config' | 'runtime' | 'unknown';
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Detect configuration errors
    const isConfigError = error.message.includes('Missing required') || 
                          error.message.includes('VITE_SUPABASE') ||
                          error.message.includes('[FATAL]');
    
    return {
      hasError: true,
      error,
      errorType: isConfigError ? 'config' : 'runtime',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError('ErrorBoundary', { error, errorInfo });
    
    this.setState({
      error,
      errorInfo,
    });

    // Always log in production for monitoring
    console.error('[ErrorBoundary] Caught error:', {
      message: error.message,
      stack: error.stack?.substring(0, 500),
      componentStack: errorInfo.componentStack?.substring(0, 300),
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  renderConfigError() {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950">
        <Card className="max-w-lg w-full border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-destructive" />
              <CardTitle className="text-destructive">Configuration Error</CardTitle>
            </div>
            <CardDescription>
              The application is missing required configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20">
              <p className="text-sm font-mono text-destructive whitespace-pre-wrap">
                {this.state.error?.message || 'Unknown configuration error'}
              </p>
            </div>
            
            <div className="rounded-md bg-muted p-4 text-sm space-y-2">
              <p className="font-medium">To fix this issue:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Check that environment variables are correctly set</li>
                <li>Verify Vercel/deployment configuration</li>
                <li>Ensure the correct Supabase project is connected</li>
                <li>Redeploy the application after fixing</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button onClick={this.handleReload} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
              <Button onClick={() => window.location.href = '/'} variant="outline">
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  renderRuntimeError() {
    const { error, errorInfo } = this.state;
    const isDev = import.meta.env.DEV;

    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Something went wrong</CardTitle>
            </div>
            <CardDescription>
              An unexpected error occurred. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Always show error message in production for debugging */}
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-mono text-destructive break-words">
                {error?.message || 'An unexpected error occurred'}
              </p>
              
              {/* Show stack trace only in development */}
              {isDev && errorInfo && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    Stack trace (dev only)
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-48">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            {/* Production hint */}
            {!isDev && (
              <p className="text-xs text-muted-foreground">
                Error ID: {Date.now().toString(36).toUpperCase()}
              </p>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={() => window.location.href = '/'} variant="outline">
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Show different UI for config vs runtime errors
      if (this.state.errorType === 'config') {
        return this.renderConfigError();
      }

      return this.renderRuntimeError();
    }

    return this.props.children;
  }
}
