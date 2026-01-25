
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppDev from './AppDev'; // 使用簡化開發版本

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppDev />
  </React.StrictMode>
);
