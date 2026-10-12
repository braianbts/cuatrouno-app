import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El panel se publica como archivos estáticos en /admin (mismo deploy que la app del alumno).
// `npm run build` deja el resultado en ../admin, que es lo que se sube al repo.
// En desarrollo se sirve la raíz del repo como carpeta pública, para tener /plan.html, /shared y /Switzer.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : '/admin/',
  publicDir: command === 'serve' ? '..' : false,
  server: { port: 5175 },
  build: {
    outDir: '../admin',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
}));
