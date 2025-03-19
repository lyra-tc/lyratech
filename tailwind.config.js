/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff", // Tailwind NO admite `var(--background)` directamente
        foreground: "#171717",
        white: "#ffffff",
        "dark-green": "#263c2d",
        "light-green": "#bbccb5",
        "services-BG": "#a4ada5",
        "blog-BG": "#121e15",
        "light-green-blog": "#49724b",
        "light-beige": "#f8f8f6",
        "blue": "#3498db",
        "red": "#f44336",
        "dark-red": "#7d1004",
      },
      fontFamily: {
        zendots: ["ZenDots-Regular", "sans-serif"], // Asegura una fuente de respaldo
      },
    },
  },
  plugins: [],
};
