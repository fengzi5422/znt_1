import { useState, useCallback, useRef, useEffect } from 'react'

// TTS 配置接口
interface TTSConfig {
    lang?: string
    rate?: number
    pitch?: number
    volume?: number
    voice?: SpeechSynthesisVoice
}

// 服务器 TTS 配置
export interface TTSServerConfig {
    enabled: boolean
    url: string
    apiKey: string
    model: string
}

// ASR 配置
interface ASRConfig {
    lang?: string
    continuous?: boolean
    interimResults?: boolean
}

export const DEFAULT_TTS_CONFIG: TTSServerConfig = {
    enabled: false,
    url: 'https://api.openai.com/v1/audio/speech',
    apiKey: '',
    model: 'tts-1'
}

export function useTTS() {
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isSupported, setIsSupported] = useState(false)
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const queueRef = useRef<SpeechSynthesisUtterance[]>([]) // Changed to only hold SpeechSynthesisUtterance for local TTS
    const isSpeakingRef = useRef(false)

    // 加载 voices (Web Speech API)
    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            setIsSupported(true)
            const loadVoices = () => setVoices(window.speechSynthesis.getVoices())
            loadVoices()
            window.speechSynthesis.onvoiceschanged = loadVoices
        }
    }, [])

    // 真正的播放逻辑（支持 Local 和 Server）
    const speak = useCallback(async (text: string, config?: TTSConfig, serverConfig?: TTSServerConfig) => {
        if (!text) return

        // 1. 过滤文本
        const cleanText = text
            .replace(/（.*?）|\(.*?\)|[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
            .trim()
        if (!cleanText) return

        // 2. 如果启用了服务器 TTS
        if (serverConfig?.enabled && serverConfig.apiKey) {
            try {
                // 停止之前的
                if (audioRef.current) {
                    audioRef.current.pause()
                    audioRef.current = null
                }

                setIsSpeaking(true)
                const response = await fetch(serverConfig.url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serverConfig.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: serverConfig.model,
                        input: cleanText,
                        voice: 'alloy' // 默认声音，之后可以做成配置
                    })
                })

                if (!response.ok) throw new Error('TTS API Failed')

                const blob = await response.blob()
                const url = URL.createObjectURL(blob)
                const audio = new Audio(url)
                audioRef.current = audio
                audio.onended = () => setIsSpeaking(false)
                audio.play()

            } catch (err) {
                console.error('Server TTS Error:', err)
                setIsSpeaking(false)
                // 降级到本地？
            }
            return
        }

        // 3. 本地 TTS (原有逻辑)
        if (!isSupported) return
        const utterance = new SpeechSynthesisUtterance(cleanText)

        utterance.lang = config?.lang || 'zh-CN'
        utterance.rate = config?.rate || 1
        utterance.pitch = config?.pitch || 1
        utterance.volume = config?.volume || 1

        if (config?.voice) {
            utterance.voice = config.voice
        } else {
            const chineseVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN'))
            if (chineseVoice) utterance.voice = chineseVoice
        }

        // 入队
        queueRef.current.push(utterance)
        if (!isSpeakingRef.current && !window.speechSynthesis.speaking) {
            // 重新实现简易 playNext，适配纯本地队列（既然 Server TTS 不走队列）
            const processQueue = () => {
                if (queueRef.current.length === 0) {
                    isSpeakingRef.current = false
                    setIsSpeaking(false)
                    return
                }
                const nextUtt = queueRef.current.shift() as SpeechSynthesisUtterance
                isSpeakingRef.current = true
                setIsSpeaking(true)
                nextUtt.onend = () => processQueue()
                nextUtt.onerror = (e) => {
                    console.error('TTS Error:', e)
                    processQueue()
                }
                utteranceRef.current = nextUtt
                window.speechSynthesis.speak(nextUtt)
            }
            processQueue()
        }

    }, [isSupported, voices])

    // 停止
    const stop = useCallback(() => {
        // 停止本地
        if (isSupported) {
            queueRef.current = []
            isSpeakingRef.current = false
            window.speechSynthesis.cancel()
        }
        // 停止在线
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current = null
        }
        setIsSpeaking(false)
    }, [isSupported])

    // 暂停 (仅适用于本地 TTS)
    const pause = useCallback(() => {
        if (isSupported && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause()
        }
    }, [isSupported])

    // 继续 (仅适用于本地 TTS)
    const resume = useCallback(() => {
        if (isSupported && window.speechSynthesis.paused) {
            window.speechSynthesis.resume()
        }
    }, [isSupported])

    return {
        speak,
        stop,
        pause,
        resume,
        isSpeaking,
        isSupported,
        voices,
    }
}

// ASR Hook
export function useASR(config: ASRConfig = {}) {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [interimTranscript, setInterimTranscript] = useState('')
    const [isSupported, setIsSupported] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const recognitionRef = useRef<SpeechRecognition | null>(null)

    // 初始化
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const supported = !!SpeechRecognition
        setIsSupported(supported)

        if (supported) {
            const recognition = new SpeechRecognition()
            recognition.lang = config.lang || 'zh-CN'
            recognition.continuous = config.continuous || false
            recognition.interimResults = config.interimResults !== false

            recognition.onresult = (event) => {
                let finalText = ''
                let interimText = ''

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i]
                    if (result.isFinal) {
                        finalText += result[0].transcript
                    } else {
                        interimText += result[0].transcript
                    }
                }

                if (finalText) {
                    setTranscript(prev => prev + finalText)
                }
                setInterimTranscript(interimText)
            }

            recognition.onerror = (event) => {
                setError(event.error)
                setIsListening(false)
            }

            recognition.onend = () => {
                setIsListening(false)
                setInterimTranscript('')
            }

            recognitionRef.current = recognition
        }

        return () => {
            recognitionRef.current?.stop()
        }
    }, [config.lang, config.continuous, config.interimResults])

    // 开始识别
    const start = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            setTranscript('')
            setInterimTranscript('')
            setError(null)
            recognitionRef.current.start()
            setIsListening(true)
        }
    }, [isListening])

    // 停止识别
    const stop = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop()
            setIsListening(false)
        }
    }, [isListening])

    // 重置
    const reset = useCallback(() => {
        setTranscript('')
        setInterimTranscript('')
        setError(null)
    }, [])

    return {
        start,
        stop,
        reset,
        transcript,
        interimTranscript,
        isListening,
        isSupported,
        error,
    }
}

// 类型声明
declare global {
    interface Window {
        SpeechRecognition: typeof SpeechRecognition
        webkitSpeechRecognition: typeof SpeechRecognition
    }
}
