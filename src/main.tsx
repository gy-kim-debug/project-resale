import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { flushSaves, useGameStore } from './app/store';
import './styles.css';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (registration.waiting) showUpdate(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (
              worker.state === 'installed' &&
              navigator.serviceWorker.controller
            )
              showUpdate(worker);
          });
        });
      })
      .catch(() => {
        /* Gameplay and IndexedDB remain usable if offline caching is unavailable. */
      });
  });
}
function showUpdate(worker: ServiceWorker) {
  const button = document.createElement('button');
  button.className = 'update-banner';
  button.textContent = '새 버전이 있습니다 · 저장 후 새로고침';
  button.onclick = async () => {
    await flushSaves();
    if (
      useGameStore.getState().saveError &&
      !window.confirm('저장 오류가 있습니다. 백업을 받지 않고 업데이트할까요?')
    )
      return;
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => location.reload(),
      { once: true },
    );
    worker.postMessage('ACTIVATE');
  };
  document.body.append(button);
}
