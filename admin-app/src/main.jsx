import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

async function start() {
  // `npm run demo`: datos de ejemplo en memoria, sin tocar Supabase (no entra en el build de producción).
  if (import.meta.env.VITE_DEMO) {
    const { createMockClient } = await import('./demo/mockClient.js');
    window.__demoClient = createMockClient();
  }
  const { default: App } = await import('./App');
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </React.StrictMode>
  );
}
start();
