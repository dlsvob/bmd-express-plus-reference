// src/App.tsx
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { PyodideProvider } from './contexts/PyodideProvider';
import AppLayoutController from './components/layout/AppLayoutController';
import '@ant-design/v5-patch-for-react-19';
import './styles/index.css';

const App: React.FC = () => {
  console.log('[App.tsx] App component rendering...');

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PyodideProvider>
          {/* Render the component that will consume the context */}
          <AppLayoutController />
        </PyodideProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
