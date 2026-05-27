import medusaPreset from "@medusajs/ui-preset"

/** @type {import('tailwindcss').Config} */
export default {
  presets: [medusaPreset],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/dashboard-ui/**/*.{js,ts,jsx,tsx}",
    "../../node_modules/@medusajs/ui/dist/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
}
