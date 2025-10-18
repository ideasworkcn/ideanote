// https://vitejs.dev/config
const { defineConfig } = require('vite');
const path = require('path');

module.exports = defineConfig({
  css: {
    postcss: {
      plugins: [
        require('@tailwindcss/postcss'),
        require('autoprefixer'),
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'novel',
        'jotai',
        'tunnel-rat',
        'lowlight',
        'y-websocket',
        'y-protocols',
        'yjs',
        /^@radix-ui\/.*$/,
        /^@tiptap\/.*$/,
      ],
    },
  },
});
