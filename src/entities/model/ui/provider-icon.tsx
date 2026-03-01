import type { ModelDeveloper } from 'src/shared/config/models';
import {
    OpenAIIcon,
    AnthropicIcon,
    GoogleIcon,
    MetaIcon,
    DeepSeekIcon,
    MistralIcon,
    XAIIcon,
    QwenIcon,
    MoonshotIcon,
    MinimaxIcon,
    ZaiIcon,
} from './provider-icon/index';

const iconSize = 16;

const developerIcons: Record<ModelDeveloper, React.FC<{ size?: number }>> = {
    openai: OpenAIIcon,
    anthropic: AnthropicIcon,
    google: GoogleIcon,
    meta: MetaIcon,
    deepseek: DeepSeekIcon,
    mistral: MistralIcon,
    xai: XAIIcon,
    qwen: QwenIcon,
    moonshot: MoonshotIcon,
    zhipuai: ZaiIcon,
    minimax: MinimaxIcon,
};

type ProviderIconProps = {
    developer: ModelDeveloper;
    className?: string;
};

export function ProviderIcon({ developer, className }: ProviderIconProps) {
    const Icon = developerIcons[developer];
    return (
        <span className={className}>
            <Icon size={iconSize} />
        </span>
    );
}
