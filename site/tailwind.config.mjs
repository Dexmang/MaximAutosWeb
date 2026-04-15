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
