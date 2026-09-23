import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vault Custom Palette (Botanical Forest Dark)
        vault: {
          bg: "#07130E",
          surface: "#10231A",
          card: "#173125",
          primary: "#2DD4BF",
          accent: "#4ADE80",
          text: "#F8FAFC",
          border: "#244134",
        },
        background: "#07130E",
        foreground: "#F8FAFC",
        card: {
          DEFAULT: "#173125",
          foreground: "#F8FAFC",
        },
        popover: {
          DEFAULT: "#10231A",
          foreground: "#F8FAFC",
        },
        primary: {
          DEFAULT: "#2DD4BF",
          foreground: "#07130E",
        },
        secondary: {
          DEFAULT: "#10231A",
          foreground: "#F8FAFC",
        },
        muted: {
          DEFAULT: "#10231A",
          foreground: "#94A3B8",
        },
        accent: {
          DEFAULT: "#4ADE80",
          foreground: "#07130E",
        },
        destructive: {
          DEFAULT: "#F43F5E",
          foreground: "#F8FAFC",
        },
        border: "#244134",
        input: "#173125",
        ring: "#2DD4BF",
      },
      fontFamily: {
        logo: ["var(--font-sora)", "sans-serif"],
        hero: ["var(--font-sora)", "sans-serif"],
        heading: ["var(--font-sora)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '2xl': '1rem',
        xl: '0.75rem',
        lg: '0.5rem',
      },
      backgroundImage: {
        'radial-gradient': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
        'forest-glow': 'radial-gradient(600px circle at 50% 0%, rgba(45, 212, 191, 0.08), transparent 80%)',
      }
    },
  },
  plugins: [],
};

export default config;
