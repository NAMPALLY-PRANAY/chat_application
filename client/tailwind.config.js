/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        panel: "#f7f8fc",
        accent: "#0f766e",
        accentDark: "#115e59",
      },
    },
  },
  plugins: [],
};
