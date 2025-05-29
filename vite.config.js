import { defineConfig } from "vite";
import path from "path";
import sass from "sass";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";

  return {
    base: "./",
    server: {
      port: 3000,
      open: true,
      fs: {
        strict: false, // 允许访问非静态资源
      },
    },
    build: {
      target: "esnext",
      minify: "terser",
      outDir: isProduction ? "dist-lib" : "dist", // 不同模式输出到不同目录
      rollupOptions: {
        input: path.resolve(__dirname, "src/main.ts"),
      },
      lib: isProduction
        ? {
            entry: ["src/main.ts"],
            name: "RichEditor", // 库名称，用于全局变量名（如 UMD）
            fileName: (format, entryName) =>
              `next-gen-rich-editor.${format}.js`, // 输出文件名 next-gen-rich-editor.es.js / next-gen-rich-editor.umd.js
            cssFileName: "next-gen-rich-editor.css",
          }
        : undefined, // 非生产构建时不启用 lib 模式
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
      extensions: [".js", ".ts", ".vue", ".json"],
    },
    plugins: [
      {
        name: "sass",
        transform: (id) => {
          if (id.endsWith(".scss")) {
            return {
              code: sass.compile(id).css.toString(),
              map: null, // 提供 source map
            };
          }
        },
      },
    ],
  };
});