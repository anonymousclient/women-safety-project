/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        emergency: "#ff4d4d",
        safety: "#4CAF50",
        background: "#1a1a1a",
        surface: "#2d2d2d",
      }
    },
  },
  plugins: [],
}
