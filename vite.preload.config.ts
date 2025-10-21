// https://vitejs.dev/config
module.exports = async () => {
  const { defineConfig } = await import('vite');
  
  return defineConfig({
    build: {
      lib: {
        entry: 'src/preload.ts',
        formats: ['cjs'],
        fileName: () => 'preload.js',
      },
      rollupOptions: {
        external: ['electron'],
      },
      // 防止清空整个dist目录
      emptyOutDir: false,
    },
  });
};
