/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        void: {
          50: "#f3f0ff", 100: "#e9e3ff", 200: "#d4c9ff", 300: "#b5a0ff",
          400: "#9171ff", 500: "#7c3aed", 600: "#6d28d9", 700: "#5b21b6",
          800: "#4c1d95", 900: "#3b0764", 950: "#1e0338",
        },
        cyber: { 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2" },
      },
    },
  },
  plugins: [],
};
