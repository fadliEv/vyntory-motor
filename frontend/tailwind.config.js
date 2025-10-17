/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F4991A',
          50: '#FEF3E8',
          100: '#FDE7D1',
          200: '#FCC9A3',
          300: '#FBAB75',
          400: '#FA8D47',
          500: '#F4991A',
          600: '#D67A0F',
          700: '#B8610A',
          800: '#9A4805',
          900: '#7C3000',
        },
        neutral: {
          cream: '#F9F5F0',
          beige: '#F2EAD3',
          dark: '#344F1F',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

