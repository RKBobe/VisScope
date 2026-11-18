import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Request persistent browser storage to prevent mobile Safari/Chromium from evicting field inspection data
if (typeof navigator !== 'undefined' && 'storage' in navigator && navigator.storage.persist) {
  navigator.storage
    .persist()
    .then((persistent) => {
      if (persistent) {
        console.log('[Vis-Scope] Persistent storage granted by browser.');
      }
    })
    .catch(() => {});
}

// Register PWA Service Worker for offline field capability
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[Vis-Scope] PWA Service Worker registered:', registration.scope);
      })
      .catch((err) => {
        console.warn('[Vis-Scope] Service Worker registration failed:', err);
      });
  });
}
