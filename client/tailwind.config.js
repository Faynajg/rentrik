/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Azul marino de marca — escala completa para profundidad y jerarquía
        brand: {
          DEFAULT: "#1E3A5F",
          50: "#EEF3F9",
          100: "#D8E3F0",
          200: "#B3C7DF",
          300: "#7F9FC4",
          400: "#4E74A3",
          500: "#2C5282",
          600: "#1E3A5F",
          700: "#182F4D",
          800: "#13253C",
          900: "#0E1B2C",
          light: "#2C5282",
          dark: "#152B47",
        },
        // Verde esmeralda — rentabilidad positiva y acentos
        positive: {
          DEFAULT: "#16A34A",
          light: "#2ECC71",
          soft: "#DCFCE7",
          50: "#F0FDF4",
        },
        negative: {
          DEFAULT: "#DC2626",
          light: "#E74C3C",
          soft: "#FEE2E2",
        },
        gold: {
          DEFAULT: "#C79A3C",
          light: "#E3C57A",
          soft: "#FBF4E4",
        },
        canvas: "#F6F8FB",
        ink: "#0F1B2D",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      letterSpacing: {
        tightest: "-0.03em",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,27,45,0.04), 0 1px 3px rgba(15,27,45,0.06)",
        soft: "0 2px 8px rgba(15,27,45,0.06), 0 1px 2px rgba(15,27,45,0.04)",
        cardHover: "0 12px 32px rgba(15,27,45,0.12)",
        elevated: "0 20px 50px -12px rgba(15,27,45,0.25)",
        glow: "0 0 0 1px rgba(30,58,95,0.05), 0 10px 40px -10px rgba(30,58,95,0.3)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #1E3A5F 0%, #2C5282 100%)",
        "brand-radial": "radial-gradient(1200px 600px at 50% -20%, rgba(44,82,130,0.18), transparent 70%)",
        "hero-grid":
          "linear-gradient(to right, rgba(30,58,95,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(30,58,95,0.05) 1px, transparent 1px)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.4s ease both",
        fadeUp: "fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both",
        floaty: "floaty 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
