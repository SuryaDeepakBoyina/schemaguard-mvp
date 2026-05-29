import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/validate-record': 'http://schemaguard:8000',
      '/suggest-fixes': 'http://schemaguard:8000',
      '/fhir-check': 'http://schemaguard:8000',
      '/metrics': 'http://schemaguard:8000',
      '/health': 'http://schemaguard:8000'
    }
  }
});
