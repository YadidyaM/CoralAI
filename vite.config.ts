import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['buffer', 'process'],
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process',
    },
  },
  define: {
    // Expose environment variables to the client
    global: 'globalThis',
  },
  server: {
    // Allow external connections for development
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    // Increase chunk size limit for larger dependencies
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'solana-web3': ['@solana/web3.js'],
          'solana-agent-kit': ['solana-agent-kit'],
          'jupiter-api': ['@jup-ag/api'],
        },
      },
    },
  },
});
