# Streamlit 部署指南

本项目已配置为支持 Streamlit 部署。由于项目包含复杂的 React 前端和 Live2D 模型，我们采用了 **静态资源服务 + Iframe 嵌入** 的混合模式，以确保最佳性能和兼容性。

## 快速开始

在终端中运行以下命令启动应用：

```bash
streamlit run app_streamlit.py
```

应用将会自动打开浏览器窗口，加载 AI 虚拟助手界面。

## 部署原理

1. **前端构建**：我们使用 `vite-plugin-singlefile` 将 React 应用打包为 `dist/index.html`。
2. **后台服务**：`app_streamlit.py` 会在后台启动一个轻量级的 HTTP 服务器（默认端口 8080）来托管 `dist` 目录下的静态文件（包括 Live2D 模型）。
3. **界面嵌入**：Streamlit 通过 `st.components.v1.iframe` 将本地服务嵌入到页面中。

## 重新构建 (如果修改了代码)

如果你修改了 `src` 下的前端代码，需要重新构建才能生效：

```bash
npx vite build
```

注意：使用 `npx vite build` 可以跳过严格的 TypeScript 类型检查，确保快速生成产物。
