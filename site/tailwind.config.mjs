/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0a2540',
          light: '#1a3a5c',
          dark: '#061a2e',
        },
        orange: {
          DEFAULT: '#f08010',
          light: '#f59a3e',
          dark: '#c86a0a',
          // Orange as TEXT on white. The brand orange is 2.69:1 there, too faint for a
          // label; ink is 5.34:1 and still reads as the brand (P1-13, D1-43).
          ink: '#a85400',
        },
        surface: '#f8f9fa',
        'surface-dim': '#edeeef',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
