/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   "#09090b",
          secondary: "#111117",
          card:      "#111117",
          elevated:  "#1a1a24",
        },
        accent: {
          DEFAULT: "#ff4500",
          light:   "#ff5722",
          dark:    "#e63d00",
          dim:     "rgba(255,69,0,0.1)",
          glow:    "rgba(255,69,0,0.25)",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.06)",
          md:      "rgba(255,255,255,0.1)",
          lg:      "rgba(255,255,255,0.15)",
        },
        text: {
          primary:   "#f4f4f5",
          secondary: "#a1a1aa",
          muted:     "#52525b",
        },
        emerald: { DEFAULT: "#10b981", dim: "rgba(16,185,129,0.08)" },
        amber:   "#f59e0b",
        violet:  "#a855f7",
      },
      fontFamily: {
        sans:    ["DM Sans", "system-ui", "sans-serif"],
        display: ["Sora", "sans-serif"],
        brand:   ["Sora", "sans-serif"],
      },
      animation: {
        "fade-up":   "fadeInUp 0.45s ease forwards",
        "fade-in":   "fadeIn 0.3s ease forwards",
        shimmer:     "shimmer 2s linear infinite",
        "pulse-soft":"pulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.5" },
        },
      },
      boxShadow: {
        card:         "0 1px 3px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.3)",
        "card-hover": "0 12px 48px rgba(0,0,0,0.5)",
        accent:       "0 4px 16px rgba(255,69,0,0.25)",
        "accent-lg":  "0 8px 32px rgba(255,69,0,0.4)",
        glow:         "0 0 40px rgba(255,69,0,0.15)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":  "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
