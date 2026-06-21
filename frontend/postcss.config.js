/** @type {import('postcss').Config} */
// PostCSS processes CSS. Tailwind is a PostCSS plugin.
// Using ES module export because package.json has "type": "module".
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
