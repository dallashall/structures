import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // IndexedDB is scoped per origin. A shared port lets other apps clear this app's data.
    // strictPort fails instead of moving to another port, which would show an empty database.
    port: 41731,
    strictPort: true,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
