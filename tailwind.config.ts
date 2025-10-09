import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{md,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0033A1",
          50: "#E6ECF8",
          100: "#CCD8F1",
          200: "#99B1E3",
          300: "#668AD5",
          400: "#3363C7",
          500: "#0033A1",
          600: "#002C8C",
          700: "#002577",
          800: "#001E61",
          900: "#00174C"
        }
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.06), 0 10px 15px -5px rgba(0,0,0,0.05)"
      },
      borderColor: {
        hairline: "rgba(0,0,0,0.08)"
      }
    }
  },
  plugins: []
};

export default config;
