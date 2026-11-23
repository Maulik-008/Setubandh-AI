// First import: fixes the cascade-layer order before any Astryx or theme CSS loads (ADR 0012).
import '@setubandh/ui/globals.css';
import { AppTheme } from '@setubandh/ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <AppTheme>
      <App />
    </AppTheme>
  </StrictMode>,
);
