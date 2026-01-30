import { useState, useCallback, useRef, useEffect } from 'react'

// SSE 配置
interface SSEConfig {
    url: string
    onMessage: (text: string) => void
    onComplete?: () => void
    onError?: (error: Error) => void
}

// 句子缓冲器
class SentenceBuffer {
    private buffer = ''
    private onSentence: (sentence: string) => void

    constructor(onSentence: (sentence: string) => void) {
        this.onSentence = onSentence
    }

    // 添加文本，遇到句子结束符时触发回调
    add(text: string) {
        this.buffer += text

        // 检查句子边界（逗号、句号、感叹号、问号）
        const sentenceBreaks = /([。！？，,.!?])/g
        let match
        let lastIndex = 0

        while ((match = sentenceBreaks.exec(this.buffer)) !== null) {
            const sentence = this.buffer.slice(lastIndex, match.index + 1).trim()
            if (sentence) {
                this.onSentence(sentence)
            }
            lastIndex = match.index + 1
        }

        // 保留未完成的部分
        this.buffer = this.buffer.slice(lastIndex)
    }

    // 刷新剩余内容
    flush() {
        if (this.buffer.trim()) {
            this.onSentence(this.buffer.trim())
        }
        this.buffer = ''
    }
}

export function useSSE() {
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

    // 发送 SSE 请求
    const sendMessage = useCallback(async (
        message: string | { role: string, content: string }[],
        config: Omit<SSEConfig, 'url'> & {
            url?: string
            model?: string
            systemPrompt?: string
        }
    ) => {
        // 从环境变量获取配置 (作为默认值)
        const apiKey = import.meta.env.VITE_API_KEY
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.openai.com/v1'
        const defaultModel = import.meta.env.VITE_API_MODEL || 'gpt-3.5-turbo'
        const defaultSystemPrompt = import.meta.env.VITE_SYSTEM_PROMPT || '你是一个可爱的虚拟助手 Hiyori。'

        // 优先使用传入的配置
        const model = config.model || defaultModel
        const systemPrompt = config.systemPrompt || defaultSystemPrompt

        const url = config.url || `${apiBaseUrl}/chat/completions`

        // 构造消息列表
        let messages = []
        if (Array.isArray(message)) {
            // 如果传入的是历史记录数组，确保包含 System Prompt
            messages = [
                { role: 'system', content: systemPrompt },
                ...message
            ]
        } else {
            // 如果只传入单条消息（兼容旧用法）
            messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ]
        }

        // 简单截断历史记录防止 Token 溢出 (保留最近 20 条)
        if (messages.length > 21) {
            messages = [
                messages[0], // System Prompt
                ...messages.slice(-20)
            ]
        }

        // 取消之前的请求
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        abortControllerRef.current = new AbortController()
        setIsConnected(true)
        setError(null)

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    stream: true,
                    temperature: 0.7,
                }),
                signal: abortControllerRef.current.signal,
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`API 请求失败: ${response.status} ${response.statusText} - ${errorText}`)
            }

            const reader = response.body?.getReader()
            if (!reader) {
                throw new Error('无法读取响应流')
            }

            const decoder = new TextDecoder()
            const sentenceBuffer = new SentenceBuffer(config.onMessage)
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()

                if (done) {
                    sentenceBuffer.flush()
                    break
                }

                const chunk = decoder.decode(value, { stream: true })
                buffer += chunk

                const lines = buffer.split('\n')
                // 保留最后一个可能不完整的行
                buffer = lines.pop() || ''

                for (const line of lines) {
                    const trimmedLine = line.trim()
                    if (!trimmedLine || trimmedLine === 'data: [DONE]') continue

                    if (trimmedLine.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(trimmedLine.slice(6))
                            // 兼容 OpenAI 格式
                            const content = data.choices?.[0]?.delta?.content || ''
                            if (content) {
                                sentenceBuffer.add(content)
                            }
                        } catch (e) {
                            console.warn('解析 SSE 数据失败:', trimmedLine)
                        }
                    }
                }
            }

            config.onComplete?.()
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                console.error('SSE Error:', err)
                setError(err)
                config.onError?.(err)
            }
        } finally {
            setIsConnected(false)
        }
    }, [])

    // 取消请求
    const cancel = useCallback(() => {
        abortControllerRef.current?.abort()
        setIsConnected(false)
    }, [])

    // 清理
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort()
        }
    }, [])

    return {
        sendMessage,
        cancel,
        isConnected,
        error,
    }
}

// 模拟 SSE 响应（开发用）
export function useMockSSE() {
    const [isConnected, setIsConnected] = useState(false)
    const timeoutRef = useRef<number | null>(null)

    const sendMessage = useCallback(async (
        _message: string,
        config: Omit<SSEConfig, 'url'>
    ) => {
        setIsConnected(true)

        // 模拟响应文本
        const responses = [
            '你好！我是你的AI助手。',
            '我可以帮助你解答各种问题，',
            '进行有趣的对话，',
            '或者陪你聊天。',
            '有什么我可以帮助你的吗？',
        ]

        const sentenceBuffer = new SentenceBuffer(config.onMessage)

        for (const sentence of responses) {
            // 逐字输出
            for (const char of sentence) {
                await new Promise(resolve => {
                    timeoutRef.current = window.setTimeout(resolve, 50)
                })
                sentenceBuffer.add(char)
            }
        }

        sentenceBuffer.flush()
        config.onComplete?.()
        setIsConnected(false)
    }, [])

    const cancel = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        setIsConnected(false)
    }, [])

    return {
        sendMessage,
        cancel,
        isConnected,
        error: null,
    }
}
