// src/App.tsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { PyodideProvider } from './contexts/PyodideProvider';
import AppLayoutController from './components/layout/AppLayoutController';
import '@ant-design/v5-patch-for-react-19';
import './styles/index.css';

const App: React.FC = () => {
  console.log('[App.tsx] App component rendering...');

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <PyodideProvider>
          {/* Render the component that will consume the context */}
          <AppLayoutController />
        </PyodideProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
