import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 消息类型
export interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    isStreaming?: boolean
}

// 会话类型
export interface Session {
    id: string
    title: string
    messages: Message[]
    createdAt: number
    updatedAt: number
}

// 对话状态
interface ChatState {
    // 当前视图状态
    messages: Message[]
    isLoading: boolean
    inputMode: 'text' | 'voice'

    // 多会话管理
    sessions: Session[]
    currentSessionId: string

    // Actions
    addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string
    updateMessage: (id: string, content: string) => void
    setMessageStreaming: (id: string, isStreaming: boolean) => void
    setLoading: (loading: boolean) => void
    setInputMode: (mode: 'text' | 'voice') => void
    clearMessages: () => void // 仅清空当前界面，实际是新建会话

    // Session Actions
    createNewSession: () => void
    deleteSession: (id: string) => void
    switchSession: (id: string) => void
    updateSessionTitle: (id: string, title: string) => void
}

// 生成唯一ID
const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
const generateSessionId = () => `sess_${Date.now()}`

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            messages: [],
            isLoading: false,
            inputMode: 'text',
            sessions: [],
            currentSessionId: '',

            // 创建新会话
            createNewSession: () => {
                const newSession: Session = {
                    id: generateSessionId(),
                    title: '新对话',
                    messages: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }
                set((state) => ({
                    sessions: [newSession, ...state.sessions],
                    currentSessionId: newSession.id,
                    messages: [],
                    isLoading: false
                }))
            },

            // 切换会话
            switchSession: (id) => {
                const { sessions } = get()
                const targetSession = sessions.find(s => s.id === id)
                if (targetSession) {
                    set({
                        currentSessionId: id,
                        messages: targetSession.messages,
                        isLoading: false
                    })
                }
            },

            // 删除会话
            deleteSession: (id) => {
                set((state) => {
                    const newSessions = state.sessions.filter(s => s.id !== id)
                    // 如果删除了当前会话
                    if (state.currentSessionId === id) {
                        // 如果还有其他会话，切换到第一个；否则创建新的
                        if (newSessions.length > 0) {
                            return {
                                sessions: newSessions,
                                currentSessionId: newSessions[0].id,
                                messages: newSessions[0].messages
                            }
                        } else {
                            const newSession = {
                                id: generateSessionId(),
                                title: '新对话',
                                messages: [],
                                createdAt: Date.now(),
                                updatedAt: Date.now(),
                            }
                            return {
                                sessions: [newSession],
                                currentSessionId: newSession.id,
                                messages: []
                            }
                        }
                    }
                    return { sessions: newSessions }
                })
            },

            updateSessionTitle: (id, title) => {
                set((state) => ({
                    sessions: state.sessions.map(s =>
                        s.id === id ? { ...s, title } : s
                    )
                }))
            },

            addMessage: (message) => {
                const { currentSessionId } = get()

                // 如果没有当前会话，先创建一个
                let activeSessionId = currentSessionId
                if (!activeSessionId) {
                    const newSession = {
                        id: generateSessionId(),
                        title: '新对话',
                        messages: [],
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }
                    set((state) => ({ // 使用函数式更新确保这里是最新的
                        sessions: [newSession, ...state.sessions],
                        currentSessionId: newSession.id
                    }))
                    activeSessionId = newSession.id
                }

                const id = generateId()
                const newMessage: Message = {
                    ...message,
                    id,
                    timestamp: Date.now(),
                }

                set((state) => {
                    const updatedSessions = state.sessions.map(s => {
                        if (s.id === activeSessionId) {
                            // 自动更新标题 (如果是第一条用户消息)
                            let newTitle = s.title
                            if (s.messages.length === 0 && message.role === 'user') {
                                newTitle = message.content.slice(0, 10) || '新对话'
                            }
                            return {
                                ...s,
                                messages: [...s.messages, newMessage],
                                title: newTitle,
                                updatedAt: Date.now()
                            }
                        }
                        return s
                    })

                    return {
                        messages: [...state.messages, newMessage],
                        sessions: updatedSessions,
                        currentSessionId: activeSessionId // 确保ID同步
                    }
                })
                return id
            },

            updateMessage: (id, content) => {
                set((state) => {
                    const updatedMessages = state.messages.map((msg) =>
                        msg.id === id ? { ...msg, content } : msg
                    )

                    const updatedSessions = state.sessions.map(s =>
                        s.id === state.currentSessionId
                            ? { ...s, messages: updatedMessages, updatedAt: Date.now() }
                            : s
                    )

                    return {
                        messages: updatedMessages,
                        sessions: updatedSessions
                    }
                })
            },

            setMessageStreaming: (id, isStreaming) => {
                set((state) => {
                    const updatedMessages = state.messages.map((msg) =>
                        msg.id === id ? { ...msg, isStreaming } : msg
                    )

                    // 流状态一般不需要持久化到 Session 列表深处，或者同步更新也可以
                    const updatedSessions = state.sessions.map(s =>
                        s.id === state.currentSessionId
                            ? { ...s, messages: updatedMessages } // 流不需要更新 updatedAt
                            : s
                    )

                    return {
                        messages: updatedMessages,
                        sessions: updatedSessions
                    }
                })
            },

            setLoading: (loading) => set({ isLoading: loading }),
            setInputMode: (mode) => set({ inputMode: mode }),
            clearMessages: () => get().createNewSession(), // clear 实际上变成新建会话
        }),
        {
            name: 'chat-storage', // localStorage key
            partialize: (state) => ({ sessions: state.sessions, currentSessionId: state.currentSessionId }), // 只持久化会话数据
        }
    )
)

// Avatar 状态
interface AvatarState {
    isLoaded: boolean
    isSpeaking: boolean
    currentEmotion: string
    frameRate: number

    setLoaded: (loaded: boolean) => void
    setSpeaking: (speaking: boolean) => void
    setEmotion: (emotion: string) => void
    setFrameRate: (fps: number) => void
}

export const useAvatarStore = create<AvatarState>((set) => ({
    isLoaded: false,
    isSpeaking: false,
    currentEmotion: 'idle',
    frameRate: 60,

    setLoaded: (loaded) => set({ isLoaded: loaded }),
    setSpeaking: (speaking) => set({ isSpeaking: speaking }),
    setEmotion: (emotion) => set({ currentEmotion: emotion }),
    setFrameRate: (fps) => set({ frameRate: fps }),
}))
