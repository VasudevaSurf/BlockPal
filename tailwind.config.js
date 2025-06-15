/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "yellow-custom": "#D4A853",
        "yellow-hover": "#B8962C",
        "dark-bg": "#0F0F0F",
        "dark-card": "#1A1A1A",
        "dark-border": "#2A2A2A",
        "dark-input": "#3A3A3A",
        "gray-text": "#9CA3AF",
      },
      fontFamily: {
        mayeka: ["Mayeka Bold Demo", "Inter", "Arial", "sans-serif"],
        satoshi: ["Satoshi", "Inter", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
