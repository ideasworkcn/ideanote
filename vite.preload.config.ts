// https://vitejs.dev/config
module.exports = async () => {
  const { defineConfig } = await import('vite');
  
  return defineConfig({
    build: {
      rollupOptions: {
        external: ['electron'],
      },
    },
  });
};
