/** @type {import("tailwindcss").Config} */
module.exports = {
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: ["./src/**/*.tsx", "../../packages/ui/src/**/*.tsx"],
  darkMode: "class",
  theme: {
    extend: {
      borderWidth: {
        DEFAULT: "1.5px",
      },
      screens: {
        nav: "900px",
      },
      colors: {
        // values live in globals.css so users can switch between the classic and new themes
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        tertiary: "rgb(var(--color-tertiary) / <alpha-value>)",
        quaternary: "rgb(var(--color-quaternary) / <alpha-value>)",
        quinary: "rgb(var(--color-quinary) / <alpha-value>)",
      },
      animation: {
        enter: "enter 200ms ease-out",
        leave: "leave 150ms ease-in forwards",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      keyframes: {
        enter: {
          "0%": { transform: "translateY(-4px)", opacity: 0 },
          "100%": { transform: "translateY(0px)", opacity: 1 },
        },
        leave: {
          "0%": { transform: "translateY(0px)", opacity: 1 },
          "100%": { transform: "translateY(-4px)", opacity: 0 },
        },
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
