// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import WelcomePage from './components/WelcomePage';
import InitializeProject from './components/InitializeProject';
import AnalyzeProject from './components/AnalyzeProject';
import { PyodideProvider } from './contexts/PyodideProvider';

const App: React.FC = () => {
  return (
    <PyodideProvider>
      <Router>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/initialize" element={<InitializeProject />} />
          <Route path="/analyze" element={<AnalyzeProject />} />
        </Routes>
      </Router>
    </PyodideProvider>
  );
};

export default App;