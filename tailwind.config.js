/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf8f4",
          100: "#fbf0e6",
          200: "#f6dec9",
          300: "#ecc2a0",
          400: "#df9f71",
          500: "#cf7841",
          600: "#b75c28",
          700: "#97451f",
          800: "#7b391d",
          900: "#65301b",
          950: "#39170b",
        },
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(28, 25, 23, 0.05)",
        card: "0 1px 3px 0 rgba(28, 25, 23, 0.04), 0 1px 2px -1px rgba(28, 25, 23, 0.04)",
        elevated: "0 4px 6px -1px rgba(28, 25, 23, 0.05), 0 2px 4px -2px rgba(28, 25, 23, 0.05)",
      },
    },
  },
  plugins: [],
};
