
import './src/styles.css'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // 使用完整功能版本

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <App />
);
