// First import: fixes the cascade-layer order before any Astryx or theme CSS loads (ADR 0012).
import '@setubandh/ui/globals.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AppProviders } from './app/AppProviders';
import { routes } from './app/router';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

const router = createBrowserRouter(routes);

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
