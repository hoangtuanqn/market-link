import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { i18nReady } from './i18n';
import './index.css';

// Đợi bản dịch của ngôn ngữ đã chọn (English có sẵn nên gần như tức thì)
void i18nReady.finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
