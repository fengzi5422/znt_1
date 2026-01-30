import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), viteSingleFile()],
    base: './', // 确保相对路径
    server: {
        host: true,
        port: 5173
    },
    build: {
        target: 'es2020',
        cssCodeSplit: false, // 禁用 CSS 分割，内联到 HTML
        assetsInlineLimit: 100000000, // 强制内联所有资源
        rollupOptions: {
            output: {
                manualChunks: undefined, // 禁用代码分割
            },
        },
    },
    optimizeDeps: {
        esbuildOptions: {
            target: 'es2020'
        }
    }
})
