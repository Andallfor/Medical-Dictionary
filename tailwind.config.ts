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
        primary0: '#b6b6ba',
        primary10: '#bebec1',
        primary20: '#c6c6c9',
        primary30: '#ceced1',
        primary40: '#d6d6d8',
        primary50: '#dedee0',
        surface0: '#121212',
        surface10: '#282828',
        surface20: '#3f3f3f',
        surface30: '#575757',
        surface40: '#717171',
        surface50: '#8b8b8b',
        tonal0: '#202020',
        tonal10: '#353535',
        tonal20: '#4b4b4b',
        tonal30: '#626262',
        tonal40: '#7a7a7a',
        tonal50: '#939393',
      },
    },
  },
  plugins: [],
} satisfies Config;
