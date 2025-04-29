// src/App.tsx
import React from 'react';
import { Provider } from 'react-redux'; // Keep Redux Provider
import { store } from './store/store'; // Keep store import
import ErrorBoundary from './components/shared/ErrorBoundary'; // Keep ErrorBoundary
import { PyodideProvider } from './contexts/PyodideProvider'; // Keep PyodideProvider
import AppLayoutController from './components/layout/AppLayoutController'; // Import the new controller component
import '@ant-design/v5-patch-for-react-19'; // Keep AntD patch
import './styles/index.css'; // Keep CSS

// The main App component now only sets up providers and renders the layout controller
const App: React.FC = () => {
  console.log('[App.tsx] App component rendering...'); // Keep log

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
