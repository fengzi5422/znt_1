import { useCallback, useState, useEffect } from 'react'

// Live2D 配置
interface Live2DConfig {
    modelPath: string
    scale?: number
    x?: number
    y?: number
}

// Live2D Hook (Iframe 版)
export function useLive2D(iframeRef: React.RefObject<HTMLIFrameElement>, config: Live2DConfig) {
    const [isLoaded, setIsLoaded] = useState(false)
    const [isReady, setIsReady] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    // 发送消息到 iframe
    const sendMessage = useCallback((type: string, payload?: any) => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ type, payload }, '*')
        }
    }, [iframeRef])

    // 播放动作
    const playMotion = useCallback((group: string) => {
        sendMessage('motion', { group })
    }, [sendMessage])

    // 设置表情 (API 预留)
    const setExpression = useCallback((expressionName: string) => {
        sendMessage('expression', { name: expressionName })
    }, [sendMessage])

    // 设置口型
    const setParameter = useCallback((paramId: string, value: number) => {
        // 简化版：这里只处理口型，所以我们直接发送业务指令
        if (paramId === 'ParamMouthOpenY') {
            sendMessage('mouthOpen', { value })
        }
    }, [sendMessage])

    // 加载模型
    const reloadModel = useCallback((modelPath: string) => {
        setIsLoaded(false)
        sendMessage('loadModel', { path: modelPath })
    }, [sendMessage])

    // 口型同步（基于韵母）
    const lipSync = useCallback((text: string) => {
        const vowels = text.match(/[aeiouāáǎàēéěèīíǐìōóǒòūúǔùüǖǘǚǜ]/gi) || []

        let index = 0
        const interval = setInterval(() => {
            if (index >= vowels.length) {
                setParameter('ParamMouthOpenY', 0)
                clearInterval(interval)
                return
            }

            const vowel = vowels[index].toLowerCase()
            let openValue = 0.5

            if ('aāáǎà'.includes(vowel)) openValue = 1
            else if ('oōóǒò'.includes(vowel)) openValue = 0.7
            else if ('eēéěè'.includes(vowel)) openValue = 0.6
            else if ('iīíǐì'.includes(vowel)) openValue = 0.3
            else if ('uūúǔù'.includes(vowel)) openValue = 0.4

            setParameter('ParamMouthOpenY', openValue)
            index++
        }, 100)

        return () => clearInterval(interval)
    }, [setParameter])

    // 监听来自 iframe 的消息
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const { type, message } = event.data

            switch (type) {
                case 'ready':
                    setIsReady(true)
                    // iframe 就绪后初始化渲染器
                    sendMessage('init')
                    // 延迟一点加载模型
                    setTimeout(() => {
                        reloadModel(config.modelPath)
                    }, 500)
                    break
                case 'loaded':
                    setIsLoaded(true)
                    setError(null)
                    break
                case 'error':
                    setError(new Error(message))
                    break
            }
        }

        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [config.modelPath, reloadModel, sendMessage])

    return {
        isLoaded,
        isReady,
        error,
        playMotion,
        setExpression,
        setParameter,
        lipSync,
        reloadModel,
        // 兼容旧接口
        setFrameRate: () => { },
    }
}
