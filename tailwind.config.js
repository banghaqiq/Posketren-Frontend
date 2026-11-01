/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nj: {
          navy: '#0f172a',
          darkblue: '#1e3a8a',
          blue: '#2563eb',
          lightblue: '#3b82f6',
          sky: '#0284c7',
          softblue: '#eff6ff',
          mutedblue: '#dbeafe',
          accent: '#f59e0b',
          success: '#10b981',
          danger: '#ef4444',
          surface: '#f8fafc',
          border: '#e2e8f0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
