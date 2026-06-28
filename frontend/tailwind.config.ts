import type { Config } from "tailwindcss"
import {
  designColors,
  designRadii,
  designShadows,
  designSpacing,
  designTypography,
} from "./src/lib/design-tokens"

const fontSize = Object.fromEntries(
  Object.entries(designTypography).map(([name, token]) => [
    name,
    [
      token.fontSize,
      {
        lineHeight: token.lineHeight,
        fontWeight: token.fontWeight,
        letterSpacing: token.letterSpacing,
      },
    ],
  ]),
) as Record<string, [string, { lineHeight: string; fontWeight: string; letterSpacing: string }]>

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: designColors,
      fontFamily: {
        quicksand: ["Quicksand", "sans-serif"],
        "public-sans": ["Public Sans", "sans-serif"],
        "headline-lg": ["Quicksand", "sans-serif"],
        "headline-lg-mobile": ["Quicksand", "sans-serif"],
        "headline-md": ["Quicksand", "sans-serif"],
        "headline-sm": ["Quicksand", "sans-serif"],
        "body-lg": ["Public Sans", "sans-serif"],
        "body-md": ["Public Sans", "sans-serif"],
        "body-sm": ["Public Sans", "sans-serif"],
        "label-md": ["Public Sans", "sans-serif"],
        "label-xs": ["Public Sans", "sans-serif"],
        "display-timer": ["Quicksand", "sans-serif"],
        "display-hero": ["Quicksand", "sans-serif"],
      },
      fontSize,
      borderRadius: designRadii,
      spacing: designSpacing,
      boxShadow: designShadows,
    },
  },
  plugins: [],
}

export default config
