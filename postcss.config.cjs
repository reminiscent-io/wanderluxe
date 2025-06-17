module.exports = {
  plugins: [
    require('@tailwindcss/postcss')({
      config: './tailwind.config.ts',
    }),
    require('autoprefixer'),
  ],
}
