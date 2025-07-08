// src/main.tsx
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ⛔ StrictMode is intentionally removed to avoid useEffect running twice in dev
createRoot(document.getElementById('root')!).render(
  <App />
);
