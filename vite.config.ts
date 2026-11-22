import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom', 'motion', 'motion/react'],
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
        '@/lib': path.resolve(process.cwd(), 'src/lib'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'motion/react',
        'motion-brew/pill-tabs',
        'motion-brew/search-modal',
        '@astryxdesign/core/Spinner',
        'lucide-react',
        'recharts',
        'clsx',
        'tailwind-merge',
      ],
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/recharts')) {
              return 'recharts-vendor';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'icons-vendor';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react-vendor';
            }
          },
        },
      },
    },
    server: {
      allowedHosts: true as const,
      hmr: false as const,
      ws: false as const,
    },
  };
});
