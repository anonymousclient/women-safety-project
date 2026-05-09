/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#7c3aed",
        secondary: "#f472b6",
        emergency: "#ef4444",
        success: "#34d399",
        warning: "#fbbf24",
        background: "#0d0d1a",
        surface: "#1a1a2e",
        "surface-light": "#252547",
      }
    },
  },
  plugins: [],
}
