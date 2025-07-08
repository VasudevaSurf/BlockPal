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
        "mayeka-bold-demo": ["var(--font-mayeka-bold-demo)", "serif"],
        "mayeka-demi-bold-demo": ["var(--font-mayeka-demi-bold-demo)", "serif"],
        mayeka: ["var(--font-mayeka)", "serif"],
        satoshi: ["var(--font-satoshi)", "sans-serif"],
      },
      fontWeight: {
        "mayeka-thin": "100",
        "mayeka-light": "300",
        "mayeka-regular": "400",
        "mayeka-demi": "600",
        "mayeka-bold": "700",
        "satoshi-light": "300",
        "satoshi-regular": "400",
        "satoshi-medium": "500",
        "satoshi-bold": "700",
        "satoshi-black": "900",
      },
    },
  },
  plugins: [],
};
