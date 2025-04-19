import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './api'; // Import API middleware

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);