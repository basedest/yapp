import { getModelById } from 'src/shared/config/models';
import { ProviderIcon } from './provider-icon';

type ModelBadgeProps = {
    modelId: string;
    className?: string;
};

export function ModelBadge({ modelId, className }: ModelBadgeProps) {
    const model = getModelById(modelId);
    if (!model) return <span className={className}>{modelId}</span>;

    return (
        <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
            <ProviderIcon developer={model.developer} />
            <span className="truncate text-sm">{model.name}</span>
        </span>
    );
}
