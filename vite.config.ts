import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json" assert { type: "json" };

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      // crxjs 2.x + Vite 8 does not auto-process HTML files listed only in
      // web_accessible_resources, so we declare the viewer explicitly here.
      input: {
        viewer: resolve(__dirname, "src/viewer/index.html"),
      },
    },
  },
});
