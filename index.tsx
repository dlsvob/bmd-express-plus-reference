// src/index.tsx
import React from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store/store';
import '@ant-design/v5-patch-for-react-19';

console.log('[index.tsx] Script loaded, attempting to render App...'); // <-- ADD LOG

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  );
  console.log('[index.tsx] App rendering initiated.'); // <-- ADD LOG
} else {
  console.error('[index.tsx] Root container not found!'); // <-- ADD LOG
}
