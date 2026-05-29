import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/validate-record': 'http://localhost:8000',
      '/suggest-fixes': 'http://localhost:8000',
      '/fhir-check': 'http://localhost:8000',
      '/metrics': 'http://localhost:8000',
      '/health': 'http://localhost:8000'
    }
  }
});
