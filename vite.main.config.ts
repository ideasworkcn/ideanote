// https://vitejs.dev/config
module.exports = async () => {
  const { defineConfig } = await import('vite');
  
  return defineConfig({
    build: {
      lib: {
        entry: 'src/main.ts',
        formats: ['cjs'],
        fileName: () => 'main.js',
      },
      rollupOptions: {
        external: ['electron', 'node:path', 'node:fs'],
      },
      // 防止清空整个dist目录
      emptyOutDir: false,
    },
    optimizeDeps: {
      exclude: [],
    },
  });
};
