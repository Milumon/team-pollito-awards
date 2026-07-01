// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "hsl(210, 40%, 55%)",
        accent: "hsl(340, 70%, 55%)",
        background: "hsl(0, 0%, 100%)",
        foreground: "hsl(210, 10%, 10%)",
        brandYellow: "#FFD500",
        dark0: "#0E1014",
        dark1: "#16181D",
        dark2: "#20232A",
        dark3: "#2B2F37",
        consoleBg: "#0E1014",
        consoleCard: "#16181D",
        consoleYellow: "#FFD500",
        consoleOrange: "#FF9D00",
        consoleBorder: "#000000",
      },
      borderWidth: {
        3: "3px",
      },
      boxShadow: {
        "brutal-dark": "6px 6px 0px 0px #000000",
        "brutal-yellow": "6px 6px 0px 0px #FFD500",
        "brutal-dark-sm": "3px 3px 0px 0px #000000",
        "brutal-yellow-sm": "3px 3px 0px 0px #FFD500",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-plus-jakarta-sans)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
