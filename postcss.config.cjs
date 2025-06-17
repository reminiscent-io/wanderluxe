module.exports = {
  plugins: [
    require('@tailwindcss/postcss')({   // ⬅️ replaces require('tailwindcss')
      config: './tailwind.config.js',   // path to your Tailwind config
    }),
    require('autoprefixer'),
  ],
};
