
import React from 'react';
import ReactDOM from 'react-dom/client';
import TestApp from './TestApp'; // 使用測試版本確認部署

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>
);
