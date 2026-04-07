/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        accent: "#22C55E",
        page: "#F8FAFC",
        text: "#0F172A",
        muted: "#64748B"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"]
      },
      boxShadow: {
        soft: "0 8px 24px rgba(15, 23, 42, 0.06)"
      }
    }
  },
  plugins: []
};
