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
          50: "#F2F5FB",
          100: "#E6ECF8",
          200: "#CCD8F1",
          300: "#99B1E3",
          400: "#668AD5",
          500: "#335EBE",
          600: "#0033A1",
          700: "#002C8C",
          800: "#002577",
          900: "#001E61"
        },
        accent: {
          DEFAULT: "#FF530A",
          500: "#FF530A",
          600: "#E64A08",
          700: "#CC4107"
        },
        surface: {
          DEFAULT: "#F7F8FB",
          foreground: "#1F2937",
          subtle: "#FFFFFF",
          border: "rgba(15, 23, 42, 0.08)",
          "dark-default": "#0F172A",
          "dark-border": "rgba(148, 163, 184, 0.16)"
        },
        neutral: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827"
        },
        success: {
          DEFAULT: "#16A34A",
          subtle: "#DCFCE7"
        },
        warning: {
          DEFAULT: "#F59E0B",
          subtle: "#FEF3C7"
        },
        danger: {
          DEFAULT: "#DC2626",
          subtle: "#FEE2E2"
        }
      },
      fontFamily: {
        sans: ["'Work Sans'", "Inter", "system-ui", "-apple-system", "sans-serif"],
        heading: ["'Work Sans'", "Inter", "system-ui", "-apple-system", "sans-serif"]
      },
      borderRadius: {
        xl: "18px",
        "2xl": "24px",
        pill: "999px"
      },
      boxShadow: {
        card: "0 12px 32px -16px rgba(15, 23, 42, 0.2)",
        "card-hover": "0 16px 40px -12px rgba(15, 23, 42, 0.25)",
        inset: "inset 0 1px 0 rgba(255, 255, 255, 0.04)"
      },
      borderColor: {
        hairline: "rgba(15, 23, 42, 0.08)"
      },
      transitionTimingFunction: {
        calm: "cubic-bezier(0.33, 1, 0.68, 1)"
      },
      transitionDuration: {
        calm: "180ms"
      }
    }
  },
  plugins: []
};

export default config;
