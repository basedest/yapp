export type ModelDeveloper = 'openai' | 'anthropic' | 'google' | 'meta' | 'deepseek' | 'mistral';

export type ModelProvider = 'openrouter' | 'openai' | 'anthropic' | 'google' | 'meta' | 'deepseek' | 'mistral';

export type ModelCapability = 'reasoning' | 'vision' | 'tools' | 'code' | 'long-context';

export type ModelDefinition = {
    id: string;
    name: string;
    developer: ModelDeveloper;
    provider: ModelProvider;
    descriptionShort?: string;
    descriptionLong?: string;
    capabilities: ModelCapability[];
    throughput: number | null; // tok/s, null = unknown
    latency: number | null; // ms, null = unknown
    contextWindow: number;
    inputCostPer1M: number; // USD float (human-readable seed source)
    outputCostPer1M: number; // USD float
    tier: 'free' | 'standard' | 'premium';
    enabled: boolean;
    archived: boolean;
    sortOrder: number;
};

export type DeveloperMeta = {
    label: string;
    sortOrder: number;
};

export const DEVELOPER_META: Record<ModelDeveloper, DeveloperMeta> = {
    openai: { label: 'OpenAI', sortOrder: 1 },
    anthropic: { label: 'Anthropic', sortOrder: 2 },
    google: { label: 'Google', sortOrder: 3 },
    meta: { label: 'Meta', sortOrder: 4 },
    deepseek: { label: 'DeepSeek', sortOrder: 5 },
    mistral: { label: 'Mistral', sortOrder: 6 },
};

// Backward-compat alias
export const PROVIDER_META = DEVELOPER_META;

export const DEFAULT_MODEL_ID = 'openai/gpt-4o-mini';

export const MODEL_REGISTRY: ModelDefinition[] = [
    {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        developer: 'openai',
        provider: 'openrouter',
        descriptionShort: 'Fast and affordable for everyday tasks',
        capabilities: ['vision', 'tools', 'code'],
        throughput: null,
        latency: null,
        contextWindow: 128_000,
        inputCostPer1M: 0.15,
        outputCostPer1M: 0.6,
        tier: 'free',
        enabled: true,
        archived: false,
        sortOrder: 1,
    },
    {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        developer: 'openai',
        provider: 'openrouter',
        descriptionShort: 'Powerful multimodal model for complex tasks',
        capabilities: ['reasoning', 'vision', 'tools', 'code'],
        throughput: null,
        latency: null,
        contextWindow: 128_000,
        inputCostPer1M: 2.5,
        outputCostPer1M: 10,
        tier: 'standard',
        enabled: true,
        archived: false,
        sortOrder: 2,
    },
    {
        id: 'anthropic/claude-sonnet-4',
        name: 'Claude Sonnet 4',
        developer: 'anthropic',
        provider: 'openrouter',
        descriptionShort: 'Excellent reasoning and coding abilities',
        capabilities: ['reasoning', 'vision', 'tools', 'code'],
        throughput: null,
        latency: null,
        contextWindow: 200_000,
        inputCostPer1M: 3,
        outputCostPer1M: 15,
        tier: 'standard',
        enabled: true,
        archived: false,
        sortOrder: 3,
    },
    {
        id: 'anthropic/claude-3.5-haiku',
        name: 'Claude 3.5 Haiku',
        developer: 'anthropic',
        provider: 'openrouter',
        descriptionShort: 'Fast and compact for quick responses',
        capabilities: ['vision', 'tools', 'code'],
        throughput: null,
        latency: null,
        contextWindow: 200_000,
        inputCostPer1M: 0.8,
        outputCostPer1M: 4,
        tier: 'free',
        enabled: true,
        archived: false,
        sortOrder: 4,
    },
    {
        id: 'google/gemini-2.0-flash-001',
        name: 'Gemini 2.0 Flash',
        developer: 'google',
        provider: 'openrouter',
        descriptionShort: 'Lightning-fast with long context support',
        capabilities: ['vision', 'tools', 'code', 'long-context'],
        throughput: null,
        latency: null,
        contextWindow: 1_000_000,
        inputCostPer1M: 0.1,
        outputCostPer1M: 0.4,
        tier: 'free',
        enabled: true,
        archived: false,
        sortOrder: 5,
    },
    {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B',
        developer: 'meta',
        provider: 'openrouter',
        descriptionShort: 'Open-source powerhouse for diverse tasks',
        capabilities: ['reasoning', 'code'],
        throughput: null,
        latency: null,
        contextWindow: 131_072,
        inputCostPer1M: 0.39,
        outputCostPer1M: 0.39,
        tier: 'free',
        enabled: true,
        archived: false,
        sortOrder: 6,
    },
    {
        id: 'deepseek/deepseek-r1',
        name: 'DeepSeek R1',
        developer: 'deepseek',
        provider: 'openrouter',
        descriptionShort: 'Advanced reasoning with chain-of-thought',
        capabilities: ['reasoning', 'code', 'long-context'],
        throughput: null,
        latency: null,
        contextWindow: 64_000,
        inputCostPer1M: 0.55,
        outputCostPer1M: 2.19,
        tier: 'standard',
        enabled: true,
        archived: false,
        sortOrder: 7,
    },
    {
        id: 'mistralai/mistral-large',
        name: 'Mistral Large',
        developer: 'mistral',
        provider: 'openrouter',
        descriptionShort: 'Strong multilingual and coding model',
        capabilities: ['reasoning', 'tools', 'code'],
        throughput: null,
        latency: null,
        contextWindow: 128_000,
        inputCostPer1M: 2,
        outputCostPer1M: 6,
        tier: 'standard',
        enabled: true,
        archived: false,
        sortOrder: 8,
    },
];

const modelMap = new Map(MODEL_REGISTRY.map((m) => [m.id, m]));

export function toMicroUSD(usd: number): number {
    return Math.round(usd * 1_000_000);
}

export function getModelById(id: string): ModelDefinition | undefined {
    return modelMap.get(id);
}

export function getEnabledModels(): ModelDefinition[] {
    return MODEL_REGISTRY.filter((m) => m.enabled && !m.archived).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getModelsByDeveloper(developer: ModelDeveloper): ModelDefinition[] {
    return getEnabledModels().filter((m) => m.developer === developer);
}

/** @deprecated Use getModelsByDeveloper */
export function getModelsByProvider(developer: ModelDeveloper): ModelDefinition[] {
    return getModelsByDeveloper(developer);
}

/** Returns cost in micro-USD (integer). 1 unit = $0.000001. */
export function calculateCost(modelId: string, promptTokens: number, completionTokens: number): number {
    const model = modelMap.get(modelId);
    if (!model) return 0;
    const usd =
        (promptTokens / 1_000_000) * model.inputCostPer1M + (completionTokens / 1_000_000) * model.outputCostPer1M;
    return toMicroUSD(usd);
}

export function isValidModelId(id: string): boolean {
    const model = modelMap.get(id);
    return !!model && model.enabled && !model.archived;
}
