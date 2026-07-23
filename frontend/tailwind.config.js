/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F2F1EC",
        surface: "#FFFFFF",
        ink: "#1C2430",
        muted: "#5B6472",
        border: "#E1DED2",
        navy: {
          DEFAULT: "#1F3A5F",
          dark: "#162A45",
          light: "#2C5182",
        },
        brass: {
          DEFAULT: "#B8863B",
          light: "#D9AE6C",
        },
        success: "#2F6F4F",
        danger: "#A63A3A",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
