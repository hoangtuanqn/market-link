import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { i18nReady } from './i18n';
import './index.css';

// Wait for the translation of the chosen language (English is bundled so it is nearly instant)
void i18nReady.finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
