/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { LanguageProvider } from './context/LanguageContext';
import { LanguageSelectorModal } from './components/common/LanguageSelectorModal';
import { StartupSplash } from './components/common/StartupSplash';
import { startWebUpdateChecker } from './utils/webUpdateChecker';
import { startSeoManager } from './services/seoManager';
import { initializeNativeDevice } from './services/nativeDevice';
import { registerInstallation } from './services/analyticsService';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ScanMe AI Runtime Error]:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: '#F5F7FA',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 560,
              background: '#fff',
              borderRadius: 20,
              padding: 28,
              boxShadow: '0 10px 30px rgba(9,43,76,.10)',
              border: '1px solid #fecaca',
            }}
          >
            <h1 style={{ margin: '0 0 10px', color: '#991b1b', fontSize: 22, fontWeight: 800 }}>
              ScanMe AI Startup Notice
            </h1>
            <p style={{ margin: '0 0 16px', color: '#475569', lineHeight: 1.5, fontSize: 14 }}>
              An unexpected startup error occurred. You can reload the application below.
            </p>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: '0 0 18px',
                padding: 14,
                borderRadius: 12,
                background: '#fef2f2',
                color: '#991b1b',
                fontSize: 12,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              type="button"
              onClick={this.handleRetry}
              style={{
                border: 0,
                borderRadius: 12,
                padding: '12px 20px',
                background: '#1473EA',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Reload application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function MainRoot() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return startSeoManager();
  }, []);

  return (
    <RootErrorBoundary>
      <LanguageProvider>
        <App />
        <StartupSplash visible={showSplash} />
        <LanguageSelectorModal />
      </LanguageProvider>
    </RootErrorBoundary>
  );
}

// Background utility initialization
try {
  startWebUpdateChecker();
  initializeNativeDevice();
  registerInstallation();
} catch (e) {
  console.warn('[ScanMe AI init warning]', e);
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<MainRoot />);
}
