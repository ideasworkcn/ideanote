// https://vitejs.dev/config
module.exports = async () => {
  const { defineConfig } = await import('vite');
  const path = await import('path');
  
  return defineConfig({
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
        '@': path.default.resolve(__dirname, 'src'),
      },
    },
  });
};
