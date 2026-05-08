// Tailwind v4 config. Most theming moves into `src/app/globals.css` via `@theme inline`
// (see globals.css). This file exists to satisfy the architecture's locked folder layout
// and provides a typed surface for any future content-scanning or plugin overrides.

const config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
};

export default config;
