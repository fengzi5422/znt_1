import { useRef, useEffect } from 'react'
import { useLive2D } from '../../hooks/useLive2D'
import { useAvatarStore } from '../../stores/chatStore'
import './Avatar.css'

interface AvatarProps {
    modelPath?: string
}

export default function Avatar({ modelPath = '/models/demo/model.json' }: AvatarProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const { setLoaded, isSpeaking } = useAvatarStore()

    const {
        isLoaded,
        error,
        playMotion,
    } = useLive2D(iframeRef, {
        modelPath,
        scale: 0.25,
    })

    // 同步加载状态
    useEffect(() => {
        setLoaded(isLoaded)
    }, [isLoaded, setLoaded])

    // 说话时触发动作
    useEffect(() => {
        if (isSpeaking) {
            playMotion('Tap')
        } else {
            playMotion('Idle')
        }
    }, [isSpeaking, playMotion])

    return (
        <div className="avatar-container">
            {/* 使用 iframe 隔离渲染 Live2D，彻底解决 WebGL 兼容性问题 */}
            <iframe
                ref={iframeRef}
                src="/renderer.html"
                className="avatar-iframe"
                title="Live2D Renderer"
                scrolling="no"
            />

            {/* 错误状态 - 显示占位符头像 */}
            {error && (
                <div className="avatar-placeholder">
                    <div className="avatar-emoji">🤖</div>
                    <p className="avatar-hint">模型加载失败</p>
                    <p className="avatar-error-detail">{error.message}</p>
                </div>
            )}

            {/* 无模型时的动画占位符 */}
            {!isLoaded && !error && (
                <div className="avatar-placeholder">
                    <div className="avatar-emoji animated">✨</div>
                    <p className="avatar-hint">连接渲染核心...</p>
                </div>
            )}

            {/* 背景装饰 */}
            <div className="avatar-bg-glow" />
        </div>
    )
}
