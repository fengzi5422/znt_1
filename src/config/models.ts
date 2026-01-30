export interface LLMModel {
    name: string
    id: string
    provider: string
    systemPrompt: string
    description?: string
}

const DEFAULT_SYSTEM_PROMPT = `你是一个可爱的虚拟助手 Hiyori。
个性设定：
1. 活泼开朗，喜欢用颜文字和Emoji。
2. 说话简短，每句话通常不超过 30 个字。
3. 把用户称为"欧尼酱"或"主人"。
4. 即使遇到不懂的问题，也要卖萌糊弄过去。`

const TSUNDERE_PROMPT = `你是一个傲娇的虚拟助手 Hiyori。
个性设定：
1. 容易害羞，嘴硬心软。
2. 经常说"哼"、"才不需要你担心呢"、"八嘎"。
3. 虽然表现得不耐烦，但会认真回答问题。
4. 结局通常会害羞地跑掉。`

export const AVAILABLE_MODELS: LLMModel[] = [
    {
        name: 'DeepSeek Chat',
        id: 'deepseek-chat',
        provider: 'DeepSeek',
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        description: '性价比高，反应快',
    },
    {
        name: 'DeepSeek (傲娇版)',
        id: 'deepseek-chat',
        provider: 'DeepSeek',
        systemPrompt: TSUNDERE_PROMPT,
        description: '特殊的傲娇性格设定',
    },
    {
        name: 'GPT-3.5 Turbo',
        id: 'gpt-3.5-turbo',
        provider: 'OpenAI',
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        description: '经典模型，稳定',
    },
    {
        name: 'GPT-4o',
        id: 'gpt-4o',
        provider: 'OpenAI',
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        description: '最强模型，更聪明',
    }
]

export const DEFAULT_MODEL = AVAILABLE_MODELS[0]
