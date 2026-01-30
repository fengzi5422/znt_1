import { useState, useRef, useEffect, FormEvent } from 'react'
import { useChatStore, useAvatarStore } from '../../stores/chatStore'
import { useSSE } from '../../hooks/useSSE'
import { useTTS, useASR } from '../../hooks/useSpeech'
import { AVAILABLE_MODELS, DEFAULT_MODEL, LLMModel } from '../../config/models'
import './Chat.css'

export default function Chat() {
    const [input, setInput] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const {
        messages, isLoading, inputMode,
        addMessage, updateMessage, setMessageStreaming, setLoading, setInputMode,
        sessions, currentSessionId, createNewSession, switchSession, deleteSession
    } = useChatStore()
    const { setSpeaking } = useAvatarStore()

    const { sendMessage, isConnected } = useSSE()
    const { speak, stop: stopTTS, isSpeaking, isSupported: ttsSupported, voices } = useTTS()
    const { start: startASR, stop: stopASR, transcript, isListening, isSupported: asrSupported } = useASR()

    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
    const [showVoiceSettings, setShowVoiceSettings] = useState(false)

    // 模型状态
    const [selectedModel, setSelectedModel] = useState<LLMModel>(DEFAULT_MODEL)
    const [showModelSettings, setShowModelSettings] = useState(false)

    // 侧边栏状态
    const [showSidebar, setShowSidebar] = useState(false)

    // 过滤中文语音
    const chineseVoices = voices.filter(v => v.lang.includes('zh') || v.lang.includes('CN'))

    // 默认选择第一个中文语音
    useEffect(() => {
        if (!selectedVoice && chineseVoices.length > 0) {
            setSelectedVoice(chineseVoices[0])
        }
    }, [chineseVoices, selectedVoice])

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // 语音识别结果
    useEffect(() => {
        if (transcript && !isListening) {
            setInput(prev => prev + transcript)
        }
    }, [transcript, isListening])

    // 同步说话状态
    useEffect(() => {
        setSpeaking(isSpeaking)
    }, [isSpeaking, setSpeaking])

    // 处理表单提交
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        // 立即停止之前的语音播放和队列
        if (ttsSupported) {
            stopTTS()
        }

        const userMessage = input.trim()
        setInput('')

        // 添加用户消息
        addMessage({ role: 'user', content: userMessage })

        // 添加助手消息占位符
        const assistantId = addMessage({ role: 'assistant', content: '', isStreaming: true })
        setLoading(true)

        let fullResponse = ''

        // 构造历史消息 (排除 loading 状态的消息)
        const history = messages
            .filter(m => !m.isStreaming && m.content)
            .map(m => ({ role: m.role, content: m.content }))

        // 加入当前用户消息
        const historyPayload = [
            ...history,
            { role: 'user', content: userMessage }
        ]

        // 发送 SSE 请求 (传入完整历史和选中的模型配置)
        await sendMessage(historyPayload, {
            model: selectedModel.id,
            systemPrompt: selectedModel.systemPrompt,
            onMessage: (sentence) => {
                fullResponse += sentence
                updateMessage(assistantId, fullResponse)

                // TTS 播放
                if (ttsSupported) {
                    speak(sentence, { voice: selectedVoice })
                }
            },
            onComplete: () => {
                setMessageStreaming(assistantId, false)
                setLoading(false)
            },
            onError: () => {
                updateMessage(assistantId, '抱歉，出现了一些问题，请稍后再试。')
                setMessageStreaming(assistantId, false)
                setLoading(false)
            },
        })
    }

    // 切换语音输入
    const toggleVoiceInput = () => {
        if (isListening) {
            stopASR()
        } else {
            startASR()
        }
    }

    return (
        <div className="chat-container">
            {/* 侧边栏遮罩 */}
            {showSidebar && <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} />}

            {/* 侧边栏 */}
            <div className={`sidebar ${showSidebar ? 'open' : ''} glass`}>
                <div className="sidebar-header">
                    <h3>历史记录</h3>
                    <button className="new-chat-btn" onClick={() => {
                        createNewSession()
                        setShowSidebar(false)
                    }}>+ 新建对话</button>
                </div>
                <div className="session-list">
                    {sessions.map(session => (
                        <div
                            key={session.id}
                            className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
                            onClick={() => {
                                switchSession(session.id)
                                setShowSidebar(false)
                            }}
                        >
                            <span className="session-title">{session.title}</span>
                            <button
                                className="delete-session-btn"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (confirm('确定删除此对话吗？')) {
                                        deleteSession(session.id)
                                    }
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    {sessions.length === 0 && <p className="no-sessions">暂无历史记录</p>}
                </div>
            </div>

            {/* 顶部工具栏 */}
            <div className="chat-header">
                {/* 菜单按钮 */}
                <button
                    className="menu-btn settings-btn"
                    onClick={() => setShowSidebar(true)}
                    style={{ marginRight: 'auto' }}
                    title="历史记录"
                >
                    ☰ 历史
                </button>

                {/*模型选择器*/}
                <div className="voice-selector-container" style={{ marginRight: '8px' }}>
                    <button
                        type="button"
                        className="settings-btn"
                        onClick={() => {
                            setShowModelSettings(!showModelSettings)
                            setShowVoiceSettings(false)
                        }}
                        title="模型设置"
                    >
                        🧠 {selectedModel.name.split(' ')[0]}
                    </button>

                    {showModelSettings && (
                        <div className="voice-popup glass">
                            <h4>选择人格/模型</h4>
                            <div className="voice-list">
                                {AVAILABLE_MODELS.map(model => (
                                    <button
                                        key={model.name}
                                        className={`voice-option ${selectedModel.name === model.name ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedModel(model)
                                            setShowModelSettings(false)
                                        }}
                                        title={model.description}
                                    >
                                        <div style={{ fontWeight: 'bold' }}>{model.name}</div>
                                        <div style={{ fontSize: '0.8em', opacity: 0.7 }}>{model.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 音色选择器 */}
                <div className="voice-selector-container">
                    <button
                        type="button"
                        className="settings-btn"
                        onClick={() => {
                            setShowVoiceSettings(!showVoiceSettings)
                            setShowModelSettings(false)
                        }}
                        title="语音设置"
                    >
                        ⚙️ 音色
                    </button>

                    {showVoiceSettings && (
                        <div className="voice-popup glass">
                            <h4>选择音色</h4>
                            {chineseVoices.length > 0 ? (
                                <div className="voice-list">
                                    {chineseVoices.map(voice => (
                                        <button
                                            key={voice.name}
                                            className={`voice-option ${selectedVoice?.name === voice.name ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedVoice(voice)
                                                setShowVoiceSettings(false)
                                                // 试听
                                                speak('你好，我是 Hiyori', { voice })
                                            }}
                                        >
                                            {voice.name.replace('Microsoft', '').replace('Online', '').trim()}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="no-voice-hint">未检测到中文语音包</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 消息列表 */}
            <div className="messages-list">
                {messages.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-icon">💬</div>
                        <h3>开始对话</h3>
                        <p>向我发送消息，开始交流吧！</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`message ${msg.role}`}>
                        <div className="message-bubble">
                            <p>{msg.content || (msg.isStreaming ? '思考中...' : '')}</p>
                            {msg.isStreaming && <span className="typing-indicator">●●●</span>}
                        </div>
                    </div>
                ))}

                <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <form className="input-area glass" onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? '正在听...' : '输入消息...'}
                    disabled={isLoading}
                    className="message-input"
                />

                {/* 语音按钮 */}
                {asrSupported && (
                    <button
                        type="button"
                        onClick={toggleVoiceInput}
                        className={`voice-btn ${isListening ? 'listening' : ''}`}
                        disabled={isLoading}
                    >
                        {isListening ? '🎙️' : '🎤'}
                    </button>
                )}

                {/* 发送按钮 */}
                <button
                    type="submit"
                    className="send-btn"
                    disabled={!input.trim() || isLoading}
                >
                    {isLoading ? '⏳' : '➤'}
                </button>
            </form>
        </div>
    )
}
