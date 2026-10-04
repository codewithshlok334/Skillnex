import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8080',
      '/oauth2': 'http://127.0.0.1:8080',
      '/login/oauth2': 'http://127.0.0.1:8080',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          motion: ['framer-motion'],
          query: ['@tanstack/react-query'],
          ui: ['@radix-ui/react-dialog', 'sonner'],
          react: ['react', 'react-dom', 'react-router-dom'],
          editor: ['@uiw/react-codemirror'],
          codeLanguages: ['@codemirror/lang-java', '@codemirror/lang-cpp', '@codemirror/lang-python'],
        },
      },
    },
  },
});
