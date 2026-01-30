# AI 虚拟助手

基于 Live2D 的 AI 虚拟助手 Web 应用。

## 技术栈

- React 18 + TypeScript
- Vite 5
- PixiJS 7 + pixi-live2d-display
- Zustand (状态管理)
- Web Speech API (TTS/ASR)

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 项目结构

```
src/
├── components/     # React 组件
│   ├── Avatar/     # Live2D 角色
│   └── Chat/       # 对话界面
├── hooks/          # 自定义 Hooks
│   ├── useLive2D   # Live2D 控制
│   ├── useSSE      # SSE 流式请求
│   └── useSpeech   # TTS/ASR
├── stores/         # Zustand 状态
└── App.tsx         # 主应用
```

## Live2D 模型

将 Live2D 模型文件放入 `public/models/` 目录：

```
public/models/your-model/
├── model.json (或 .model3.json)
├── model.moc3
├── textures/
├── motions/
└── expressions/
```

然后修改 `App.tsx` 中的 `modelPath` 属性。

## 功能特性

- ✅ Live2D 模型渲染与交互
- ✅ SSE 流式对话
- ✅ TTS 语音合成
- ✅ ASR 语音识别
- ✅ 移动端适配
- ✅ 软键盘避让
- ✅ iOS 音频解锁
- ✅ 省电模式（待机降帧率）

## License

MIT
