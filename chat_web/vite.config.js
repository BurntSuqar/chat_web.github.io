import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  css: {
    preprocessorOptions: {
      scss: {},
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // 设置 @ 别名指向 src 目录
    },
  },
  // server: {
  //   proxy: {
  //     "/user": {
  //       target: "https://api.deepseek.com/user",
  //       changeOrigin: true,
  //       secure: false,
  //       rewrite: (path) => path.replace(/^\/user/, "/"),
  //     },
  //   },
  // },
});
