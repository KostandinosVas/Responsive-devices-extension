/**
 * Separate Vitest config — intentionally does NOT include @crxjs/vite-plugin
 * or @tailwindcss/vite so the test runner is a clean React+jsdom environment.
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    css: false, // skip CSS processing; ?raw imports are handled before the CSS pipeline
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
