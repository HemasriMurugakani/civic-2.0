/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        civic: {
          50: '#fdf4f4',
          100: '#fbe8e8',
          200: '#f7d2d2',
          300: '#f0b0b0',
          400: '#e07e7e',
          500: '#c54242',
          600: '#991b1b',
          700: '#800000',
          800: '#680000',
          900: '#4d0000',
          950: '#2b0000',
        },
        maroon: {
          50: '#fdf4f4',
          100: '#fbe8e8',
          200: '#f7d2d2',
          600: '#991b1b',
          700: '#800000',
          800: '#680000',
          900: '#4d0000',
        },
        warm: {
          50: '#faf9f6',
          100: '#f5f2eb',
          200: '#ebe5db',
          300: '#ddd5c7',
          800: '#292524',
          900: '#1c1917',
          950: '#141211',
        },
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
        },
        status: {
          submitted: '#64748b',
          assigned: '#2563eb',
          acknowledged: '#6366f1',
          in_progress: '#f59e0b',
          resolved: '#0d9488',
          citizen_verified: '#16a34a',
          reopened: '#e11d48',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Tamil', 'system-ui', 'sans-serif'],
        tamil: ['Noto Sans Tamil', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
