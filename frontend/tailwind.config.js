/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        // Clean, professional palette — HRISELINK inspired
        brand: {
          50: "#f0f4ff",
          100: "#dbe4ff",
          500: "#4263eb",
          600: "#3b5bdb",
          700: "#364fc7",
        },
        surface: "#ffffff",
        card: "#ffffff",
        muted: "#868e96",
        ink: "#212529",
        border: "#e9ecef",
        // Functional colors
        success: { light: "#d3f9d8", DEFAULT: "#2b8a3e", border: "#b2f2bb" },
        danger: { light: "#ffe3e3", DEFAULT: "#c92a2a", border: "#ffc9c9" },
        warning: { light: "#fff3bf", DEFAULT: "#e67700", border: "#ffe066" },
        info: { light: "#d0ebff", DEFAULT: "#1864ab", border: "#a5d8ff" },
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.03)',
        'elevated': '0 4px 12px -2px rgb(0 0 0 / 0.08)',
        'modal': '0 20px 60px -12px rgb(0 0 0 / 0.15)',
      },
      borderRadius: {
        'card': '12px',
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        splashExit: {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(1.02)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-4px)" },
          "40%": { transform: "translateX(4px)" },
          "60%": { transform: "translateX(-3px)" },
          "80%": { transform: "translateX(3px)" },
        },
        pulse_ring: {
          "0%": { transform: "scale(1)", opacity: "0.4" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fadeIn 400ms ease-out forwards",
        "slide-up": "slideUp 400ms ease-out forwards",
        "slide-in-left": "slideInLeft 300ms ease-out forwards",
        "scale-in": "scaleIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        shimmer: "shimmer 2s infinite linear",
        shake: "shake 400ms ease-in-out",
        "splash-exit": "splashExit 500ms ease-in forwards",
        "pulse-ring": "pulse_ring 1.5s ease-out infinite",
      },
    },
  },
  plugins: [],
};
