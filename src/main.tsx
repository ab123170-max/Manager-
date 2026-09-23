import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

type LoadedApp = {
  App: React.ComponentType;
  LanguageProvider: React.ComponentType<React.PropsWithChildren>;
  LanguageSelectorModal: React.ComponentType;
};

function StartupError({ error, retry }: { error: unknown; retry: () => void }) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown application startup error';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: '#F5F7FA',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 560,
        background: '#fff',
        borderRadius: 20,
        padding: 24,
        boxShadow: '0 10px 30px rgba(9,43,76,.10)',
        border: '1px solid #e5e7eb'
      }}>
        <h1 style={{ margin: '0 0 8px', color: '#092B4C', fontSize: 22 }}>
          ScanMe AI failed to start
        </h1>
        <p style={{ margin: '0 0 16px', color: '#475569', lineHeight: 1.5 }}>
          The production application encountered a startup error. Reload after fixing the reported issue.
        </p>
        <pre style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          margin: '0 0 18px',
          padding: 14,
          borderRadius: 12,
          background: '#f8fafc',
          color: '#991b1b',
          fontSize: 12,
          overflow: 'auto'
        }}>{message}</pre>
        <button
          type="button"
          onClick={retry}
          style={{
            border: 0,
            borderRadius: 12,
            padding: '11px 16px',
            background: '#1473EA',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Reload application
        </button>
      </div>
    </div>
  );
}

function Bootstrap() {
  const [loaded, setLoaded] = useState<LoadedApp | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    Promise.all([
      import('./App.tsx'),
      import('./context/LanguageContext'),
      import('./components/common/LanguageSelectorModal'),
    ])
      .then(([appModule, languageModule, modalModule]) => {
        if (!active) return;
        setLoaded({
          App: appModule.default,
          LanguageProvider: languageModule.LanguageProvider,
          LanguageSelectorModal: modalModule.LanguageSelectorModal,
        });
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        console.error('[ScanMe AI startup]', err);
        setError(err);
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  if (error) {
    return <StartupError error={error} retry={() => {
      setLoaded(null);
      setError(null);
      setAttempt((value) => value + 1);
    }} />;
  }

  if (!loaded) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F5F7FA',
        color: '#092B4C',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontWeight: 700
      }}>
        Loading ScanMe AI...
      </div>
    );
  }

  const { App, LanguageProvider, LanguageSelectorModal } = loaded;

  return (
    <LanguageProvider>
      <App />
      <LanguageSelectorModal />
    </LanguageProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Bootstrap />);
