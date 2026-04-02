/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base:     "#0a0e17",
          surface:  "#111827",
          elevated: "#1a2233",
          hover:    "#1e2d42",
        },
        border: {
          DEFAULT: "#1f2d40",
          bright:  "#2a3f5f",
        },
        text: {
          primary:   "#e8edf5",
          secondary: "#8899aa",
          muted:     "#4a5568",
        },
        accent:   { DEFAULT: "#f5a623", dim: "#c47d10" },
        positive: "#22d15e",
        negative: "#f04e4e",
        chart: {
          1: "#4a9eff",
          2: "#22d15e",
          3: "#f5a623",
          4: "#a78bfa",
        },
      },
      fontFamily: {
        sans: ["Inter", "Helvetica Neue", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "'Courier New'", "monospace"],
      },
    },
  },
  plugins: [],
};
