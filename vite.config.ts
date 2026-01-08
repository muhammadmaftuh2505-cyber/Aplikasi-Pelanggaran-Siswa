import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Penting untuk Apache/Shared Hosting agar path asset menjadi relatif
  server: {
    host: true
  }
});