/** @type {import('tailwindcss').Config} */

/**
 * WHY this file exists:
 *   Tailwind CSS needs to know which files to scan for class names.
 *   It removes unused CSS classes in the final build (tree-shaking).
 *   This keeps the CSS file tiny in production.
 *
 * WHAT it does:
 *   - Tells Tailwind where our React components live (content paths)
 *   - Extends the default design system with our custom colors and fonts
 *
 * HOW Tailwind works:
 *   Instead of writing CSS files, you use utility classes directly in JSX:
 *   <div className="bg-blue-600 text-white rounded-lg p-4 shadow-sm">
 *   Tailwind generates the CSS for only the classes you actually use.
 */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Our brand color palette
        // Usage: className="bg-brand-600" or className="text-brand-500"
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',  // Primary — most buttons, links
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
