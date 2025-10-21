// https://vitejs.dev/config
module.exports = async () => {
  const { defineConfig } = await import('vite');
  const path = await import('path');
  
  return defineConfig({
  css: {
    postcss: {
      plugins: [
        (await import('@tailwindcss/postcss')).default,
        (await import('autoprefixer')).default,
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.default.resolve(__dirname, 'src'),
    },
  },
  base: './', // 使用相对路径
  build: {
    rollupOptions: {
    },
  },
});
};
