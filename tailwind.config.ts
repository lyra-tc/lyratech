import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'white': '#ffffff',
        'beige': '#f4f4f4',
        'lyratech-green': '#0F8F26',
        "blue": "#3498db",
        "red": "#f44336",
        "dark-red": "#7d1004",
        "lyratech-purple": "#5f66ae",
        "button-dark-purple": "#5F67AF",
        "button-light-purple": "#999ed6",
        "lyratech-light-purple": "#c6c9e5",
        "lyratech-blue":"#272a33",
        "dark-blue": "#00020E",
      },
      animation: {
        "fade-in": "fadeIn 1s ease-out both",
        "scale-in": "scaleIn 0.8s ease-out both",
        'spin-once': 'spin-once 0.5s linear forwards',
        slideInUp: 'slideInUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        'spin-once': {
          '0%': {transform: 'rotate(0deg)'},
          '100%': {transform: 'rotate(360deg)'},
        },
        slideInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px) translateX(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) translateX(0)',
          },
        },
      },
      boxShadow: {
        'contact': '0 15px 15px 5px rgba(0,0,0,0.3), 0 8px 6px 1px rgba(0,0,0,0.3)',
        'button': '0 5px 10px -4px rgba(0,0,0,0.8), 0 6px 6px 1px rgba(0,0,0,0.5)',
      },
      fontFamily: {
        zendots: ['ZenDots-Regular'],
        montserrat: ['Montserrat-Regular'],
        "montserrat-bold": ['Montserrat-Bold'],
      },
    },
  },
  plugins: [],
} satisfies Config;
