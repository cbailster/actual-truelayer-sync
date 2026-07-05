const daisy = require('daisyui');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/web/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  // DaisyUI is a theme, not a plugin in Tailwind v4
  ...daisy,
}