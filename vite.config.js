// vite.config.js
/** @type {import('vite').UserConfig} */
import { defineConfig } from "vite";
import path from "path";
export default defineConfig({
  base: "./",
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: "esnext",
    minify: "terser",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
      output: {
        manualChunks: {
          core: [path.resolve(__dirname, "src/js/core/EditorCore.js")],
          table: [path.resolve(__dirname, "src/js/modules/TableEditor.js")],
          image: [path.resolve(__dirname, "src/js/modules/ImageEditor.js")],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    extensions: [".js", ".ts", ".vue", ".json"],
  },
});
