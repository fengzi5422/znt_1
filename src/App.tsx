import { useEffect, useState } from 'react'
import Avatar from './components/Avatar'
import Chat from './components/Chat'
import './App.css'

// 软键盘避让 Hook
function useKeyboardAvoidance() {
    const [keyboardHeight, setKeyboardHeight] = useState(0)

    useEffect(() => {
        // 使用 visualViewport API 检测软键盘
        const viewport = window.visualViewport

        if (!viewport) return

        const handleResize = () => {
            const height = window.innerHeight - viewport.height
            setKeyboardHeight(Math.max(0, height))
        }

        viewport.addEventListener('resize', handleResize)
        viewport.addEventListener('scroll', handleResize)

        return () => {
            viewport.removeEventListener('resize', handleResize)
            viewport.removeEventListener('scroll', handleResize)
        }
    }, [])

    return keyboardHeight
}

export default function App() {
    const keyboardHeight = useKeyboardAvoidance()
    const [showStartButton, setShowStartButton] = useState(true)

    // iOS 音频解锁 - 需要用户点击触发
    const handleStart = () => {
        // 创建并播放静音音频以解锁 AudioContext
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        oscillator.connect(audioContext.destination)
        oscillator.start()
        oscillator.stop(0.001)

        setShowStartButton(false)
    }

    return (
        <div
            className="app"
            style={{
                paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined
            }}
        >
            {/* 启动引导页 */}
            {showStartButton && (
                <div className="start-overlay">
                    <div className="start-content glass">
                        <div className="start-logo">🤖</div>
                        <h1 className="gradient-text">AI 虚拟助手</h1>
                        <p>点击开始与您的 AI 助手对话</p>
                        <button className="start-button" onClick={handleStart}>
                            开始体验
                        </button>
                    </div>
                </div>
            )}

            {/* 主界面 */}
            <main className={`main-container ${showStartButton ? 'hidden' : ''}`}>
                {/* Avatar 区域 */}
                <section className="avatar-section">
                    <Avatar modelPath="/models/hiyori_pro_zh/runtime/hiyori_pro_t11.model3.json" />
                </section>

                {/* 对话区域 */}
                <section
                    className="chat-section"
                    style={{
                        transform: keyboardHeight > 0 ? `translateY(-${keyboardHeight * 0.3}px)` : undefined
                    }}
                >
                    <Chat />
                </section>
            </main>
        </div>
    )
}
