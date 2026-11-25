/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f8f8f6",
        mint: "#6da88a",
        tangerine: "#e89a5d",
        lavender: "#a99acb",
        lagoon: "#70aaa4",
      },
    },
  },
  plugins: [],
};
