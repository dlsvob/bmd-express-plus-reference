// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert } from 'antd'; // Use Ant Design for styling

interface Props {
    children: ReactNode;
    fallback?: ReactNode; // Optional custom fallback UI
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: undefined,
    };

    // Use this lifecycle method to update state when an error is thrown by a child
    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    // Use this lifecycle method to log error information
    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        // You could also log this to an error reporting service
        // logErrorToMyService(error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            // Render custom fallback UI if provided, otherwise default
            if (this.props.fallback) {
                return this.props.fallback;
            }
            // Default fallback UI
            return (
                <div style={{ padding: '20px' }}>
                    <Alert
                        message="Application Error"
                        description={
                            <>
                                <p>Sorry, something went wrong while rendering this part of the application.</p>
                                <p>Please try refreshing the page. If the problem persists, contact support.</p>
                                {/* Optionally display error details in development */}
                                {process.env.NODE_ENV === 'development' && this.state.error && (
                                    <pre style={{ marginTop: '10px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f0f0f0', padding: '10px', border: '1px solid #ccc' }}>
                                        {this.state.error.toString()}
                                        {this.state.error.stack && `\n\nStack Trace:\n${this.state.error.stack}`}
                                    </pre>
                                )}
                            </>
                        }
                        type="error"
                        showIcon
                    />
                </div>
            );
        }

        // Normally, just render children
        return this.props.children;
    }
}

export default ErrorBoundary;