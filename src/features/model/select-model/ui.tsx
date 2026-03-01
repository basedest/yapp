'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
    ChevronDown,
    Star,
    Brain,
    Eye,
    Code,
    Wrench,
    BookOpen,
    LayoutGrid,
    Check,
    Info,
    Search,
    Filter,
    DollarSignIcon,
    RussianRuble,
} from 'lucide-react';
import { trpc } from 'src/shared/api/trpc/client';
import { Popover, PopoverContent, PopoverTrigger } from 'src/shared/ui/popover';
import { Button } from 'src/shared/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from 'src/shared/ui/tooltip';
import { Separator } from 'src/shared/ui/separator';
import { ScrollArea } from 'src/shared/ui/scroll-area';
import { cn } from 'src/shared/lib/utils';
import {
    DEVELOPER_META,
    type ModelCapability,
    type ModelDefinition,
    type ModelDeveloper,
} from 'src/shared/config/models';
import { ProviderIcon, useFavoriteModels, useBenchmarkGroups, useModelDisplay } from 'src/entities/model';

const capabilityIcons: Record<ModelCapability, React.FC<{ className?: string }>> = {
    reasoning: Brain,
    vision: Eye,
    tools: Wrench,
    code: Code,
    'long-context': BookOpen,
};

function fmtCtx(n: number): string {
    return n >= 1_000_000 ? '1M' : `${(n / 1000) | 0}K`;
}

function getCostTier(outputCostPer1M: number): { filled: number; activeColor: string; labelKey: string } {
    if (outputCostPer1M === 0) return { filled: 0, activeColor: 'text-green-500', labelKey: 'costTiers.free' };
    if (outputCostPer1M <= 1_000_000)
        return { filled: 0, activeColor: 'text-green-500', labelKey: 'costTiers.veryLow' };
    if (outputCostPer1M <= 4_000_000) return { filled: 1, activeColor: 'text-green-500', labelKey: 'costTiers.low' };
    if (outputCostPer1M <= 10_000_000)
        return { filled: 2, activeColor: 'text-yellow-500', labelKey: 'costTiers.medium' };
    if (outputCostPer1M <= 40_000_000) return { filled: 3, activeColor: 'text-orange-500', labelKey: 'costTiers.high' };
    return { filled: 3, activeColor: 'text-red-500', labelKey: 'costTiers.veryHigh' };
}

function CostDots({ outputCostPer1M }: { outputCostPer1M: number }) {
    const t = useTranslations('models');
    const locale = useLocale();
    const { filled, activeColor, labelKey } = getCostTier(outputCostPer1M);
    const CostIcon = locale === 'ru' ? RussianRuble : DollarSignIcon;
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex cursor-default items-center gap-0.5">
                    {Array.from({ length: 3 }, (_, i) => (
                        <CostIcon
                            key={i}
                            className={cn('size-3.5', i < filled ? activeColor : 'text-muted-foreground/20')}
                        />
                    ))}
                </div>
            </TooltipTrigger>
            <TooltipContent side="top">{t(labelKey)}</TooltipContent>
        </Tooltip>
    );
}

function CapabilityIcon({ capability, active }: { capability: ModelCapability; active?: boolean }) {
    const t = useTranslations('models.capabilities');
    const Icon = capabilityIcons[capability];
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="cursor-default">
                    <Icon className={cn('size-3.5', active ? 'text-primary' : 'text-muted-foreground')} />
                </span>
            </TooltipTrigger>
            <TooltipContent side="top">{t(capability)}</TooltipContent>
        </Tooltip>
    );
}

function scoreColor(score: number): string {
    if (score >= 85) return 'text-green-600';
    if (score >= 75) return 'text-blue-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-muted-foreground';
}

function ModelInfoTooltip({
    model,
    name,
    devLabel,
    descriptionShort,
    descriptionLong,
}: {
    model: ModelDefinition;
    name: string;
    devLabel: string;
    descriptionShort: string;
    descriptionLong: string;
}) {
    const [open, setOpen] = useState(false);
    const t = useTranslations('models');
    const benchmarkGroups = useBenchmarkGroups();
    const modelBenchmarks = benchmarkGroups.get(model.id);
    const hasBenchmarks = modelBenchmarks && modelBenchmarks.length > 0;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen((v) => !v);
                    }}
                    className="shrink-0 p-0.5"
                >
                    <Info className="text-muted-foreground/60 hover:text-muted-foreground size-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent side="left" align="start" className="w-80 p-0 text-sm" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 p-4 pb-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <ProviderIcon developer={model.developer as ModelDeveloper} />
                            <span className="text-foreground font-semibold">{name}</span>
                        </div>
                        {descriptionShort && <p className="text-muted-foreground mt-1 text-xs">{descriptionShort}</p>}
                    </div>
                    <CostDots outputCostPer1M={model.outputCostPer1M} />
                </div>

                {/* Long description */}
                {descriptionLong && (
                    <>
                        <Separator />
                        <p className="text-muted-foreground px-4 py-3 text-xs leading-relaxed">{descriptionLong}</p>
                    </>
                )}

                {/* Capability pills */}
                {model.capabilities.length > 0 && (
                    <>
                        <Separator />
                        <div className="flex flex-wrap gap-1.5 px-4 py-3">
                            {model.capabilities.map((cap) => {
                                const Icon = capabilityIcons[cap];
                                return (
                                    <span
                                        key={cap}
                                        className="bg-accent text-muted-foreground flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
                                    >
                                        <Icon className="size-3" />
                                        {t(`capabilities.${cap}`)}
                                    </span>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Metadata grid */}
                <Separator />
                <div className="grid grid-cols-2 gap-x-4 px-4 py-3">
                    <div>
                        <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
                            {t('contextWindow')}
                        </p>
                        <p className="text-foreground mt-0.5 font-medium">{fmtCtx(model.contextWindow)}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-[11px] tracking-wider uppercase">{t('developer')}</p>
                        <p className="text-foreground mt-0.5 font-medium">{devLabel}</p>
                    </div>
                </div>

                {/* Benchmarks */}
                {hasBenchmarks && (
                    <>
                        <Separator />
                        <div className="px-4 py-3">
                            <p className="text-muted-foreground mb-2 text-[11px] tracking-wider uppercase">
                                {t('benchmarks')}
                            </p>
                            <div className="space-y-2">
                                {modelBenchmarks.map((group) => (
                                    <div key={group.name}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-foreground font-medium">{group.name}</span>
                                            <span className={cn('font-semibold', scoreColor(group.score))}>
                                                {group.score.toFixed(0)}
                                            </span>
                                        </div>
                                        <div className="mt-1 space-y-0.5 pl-3">
                                            {group.items.map((item) => (
                                                <div key={item.name} className="flex items-center justify-between">
                                                    <span className="text-muted-foreground text-xs">{item.name}</span>
                                                    <span className={cn('text-xs', scoreColor(item.score))}>
                                                        {item.score.toFixed(0)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
}

function DeveloperSidebar({
    developers,
    selected,
    onSelect,
}: {
    developers: ModelDeveloper[];
    selected: ModelDeveloper | 'all';
    onSelect: (dev: ModelDeveloper | 'all') => void;
}) {
    const t = useTranslations('models');
    return (
        <div className="flex max-h-[400px] flex-col gap-1.5 overflow-y-auto border-r px-2 py-2.5">
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={() => onSelect('all')}
                        className={cn(
                            'flex size-8 items-center justify-center rounded-lg transition-colors',
                            selected === 'all'
                                ? 'bg-accent ring-primary/20 ring-1'
                                : 'text-muted-foreground hover:bg-accent',
                        )}
                    >
                        <LayoutGrid className="size-5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="left">{t('allDevelopers')}</TooltipContent>
            </Tooltip>
            {developers.map((dev) => (
                <Tooltip key={dev}>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={() => onSelect(selected === dev ? 'all' : dev)}
                            className={cn(
                                'flex size-8 items-center justify-center rounded-lg transition-colors',
                                selected === dev
                                    ? 'bg-accent ring-primary/20 ring-1'
                                    : 'text-muted-foreground hover:bg-accent',
                            )}
                        >
                            <ProviderIcon developer={dev} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">{DEVELOPER_META[dev].label}</TooltipContent>
                </Tooltip>
            ))}
        </div>
    );
}

const capabilityEntries: { value: ModelCapability; Icon: React.FC<{ className?: string }> }[] = [
    { value: 'reasoning', Icon: Brain },
    { value: 'vision', Icon: Eye },
    { value: 'tools', Icon: Wrench },
    { value: 'code', Icon: Code },
    { value: 'long-context', Icon: BookOpen },
];

function CapabilityFilterButton({
    selected,
    onToggle,
    onClear,
}: {
    selected: Set<ModelCapability>;
    onToggle: (cap: ModelCapability) => void;
    onClear: () => void;
}) {
    const [open, setOpen] = useState(false);
    const t = useTranslations('models.capabilities');
    const count = selected.size;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'relative shrink-0 rounded-md p-1 transition-colors',
                        count > 0 ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                    )}
                >
                    <Filter className="size-4" />
                    {count > 0 && (
                        <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-medium">
                            {count}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0" align="end" sideOffset={8}>
                <div className="py-1">
                    {capabilityEntries.map(({ value, Icon }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => onToggle(value)}
                            className="hover:bg-accent flex w-full items-center gap-2.5 px-3 py-2 text-sm"
                        >
                            <Icon className="text-muted-foreground size-4 shrink-0" />
                            <span className="flex-1 text-left">{t(value)}</span>
                            {selected.has(value) && <Check className="text-primary size-4 shrink-0" />}
                        </button>
                    ))}
                    <Separator />
                    <button
                        type="button"
                        onClick={onClear}
                        disabled={count === 0}
                        className="text-muted-foreground hover:bg-accent w-full px-3 py-2 text-left text-sm disabled:opacity-40"
                    >
                        {t('clearFilters')}
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-muted-foreground px-3 py-1.5 text-xs font-semibold tracking-wider uppercase">
            {children}
        </div>
    );
}

function ModelItem({
    model,
    name,
    descriptionShort,
    descriptionLong,
    devLabel,
    isSelected,
    isFavorite,
    selectedCaps,
    onSelect,
    onToggleFavorite,
}: {
    model: ModelDefinition;
    name: string;
    descriptionShort: string;
    descriptionLong: string;
    devLabel: string;
    isSelected: boolean;
    isFavorite: boolean;
    selectedCaps: Set<ModelCapability>;
    onSelect: () => void;
    onToggleFavorite: () => void;
}) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(e) => e.key === 'Enter' && onSelect()}
            className={cn(
                'mx-1 flex cursor-pointer items-center justify-between gap-2.5 rounded-md px-3 py-2.5 transition-colors',
                'hover:bg-accent',
                isSelected && 'bg-accent/60',
            )}
        >
            <div className="w-38 min-w-0 shrink-0 md:w-64">
                <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-medium sm:text-base">{name}</span>
                    {isSelected && <Check className="text-primary size-3.5 shrink-0" />}
                </div>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">{descriptionShort}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="flex items-center gap-1.5">
                    <CostDots outputCostPer1M={model.outputCostPer1M} />
                    {model.capabilities.length > 0 && (
                        <div className="bg-muted/50 flex items-center gap-0.5 rounded-md border px-1.5 py-0.5">
                            {model.capabilities.map((cap) => (
                                <CapabilityIcon key={cap} capability={cap} active={selectedCaps.has(cap)} />
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <ModelInfoTooltip
                        model={model}
                        name={name}
                        devLabel={devLabel}
                        descriptionShort={descriptionShort}
                        descriptionLong={descriptionLong}
                    />
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite();
                        }}
                        className="text-muted-foreground shrink-0 p-0.5 hover:text-yellow-500"
                    >
                        <Star className={cn('size-4', isFavorite && 'fill-yellow-500 text-yellow-500')} />
                    </button>
                </div>
            </div>
        </div>
    );
}

type ModelSelectorProps = {
    value: string;
    onChange: (modelId: string) => void;
    disabled?: boolean;
};

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
    const t = useTranslations('models');
    const { getModelName, getModelDescriptionShort, getModelDescriptionLong } = useModelDisplay();
    const [open, setOpen] = useState(false);
    const [selectedDev, setSelectedDev] = useState<ModelDeveloper | 'all'>('all');
    const [selectedCaps, setSelectedCaps] = useState<Set<ModelCapability>>(new Set());
    const [search, setSearch] = useState('');

    const handleToggleCap = (cap: ModelCapability) => {
        setSelectedCaps((prev) => {
            const next = new Set(prev);
            if (next.has(cap)) next.delete(cap);
            else next.add(cap);
            return next;
        });
    };

    const { data: enabledModels = [], isLoading } = trpc.models.list.useQuery(undefined, {
        staleTime: 5 * 60 * 1000,
    });
    const { favorites, isFavorite, toggleFavorite } = useFavoriteModels();

    const selectedModel = useMemo(() => enabledModels.find((m) => m.id === value), [enabledModels, value]);

    const presentDevelopers = useMemo(() => {
        const devSet = new Set(enabledModels.map((m) => m.developer as ModelDeveloper));
        return [...devSet].sort((a, b) => DEVELOPER_META[a].sortOrder - DEVELOPER_META[b].sortOrder);
    }, [enabledModels]);

    const baseFiltered = useMemo(() => {
        let list = enabledModels;
        if (selectedDev !== 'all' && selectedCaps.size === 0) list = list.filter((m) => m.developer === selectedDev);
        if (selectedCaps.size > 0) list = list.filter((m) => m.capabilities.some((c) => selectedCaps.has(c)));
        return list;
    }, [enabledModels, selectedDev, selectedCaps]);

    const displayed = useMemo(() => {
        if (!search.trim()) return baseFiltered;
        const q = search.toLowerCase();
        return baseFiltered.filter((m) => {
            const devLabel = DEVELOPER_META[m.developer as ModelDeveloper]?.label ?? '';
            return (
                getModelName(m).toLowerCase().includes(q) ||
                devLabel.toLowerCase().includes(q) ||
                getModelDescriptionShort(m).toLowerCase().includes(q)
            );
        });
    }, [baseFiltered, search, getModelName, getModelDescriptionShort]);

    const favoritesInView = useMemo(
        () => favorites.filter((m) => displayed.some((d) => d.id === m.id)),
        [favorites, displayed],
    );
    const showFavorites = selectedDev === 'all' && selectedCaps.size === 0 && favoritesInView.length > 0;

    const handleSelect = (modelId: string) => {
        onChange(modelId);
        setOpen(false);
    };

    const handleOpenChange = (v: boolean) => {
        if (!v) {
            setSelectedDev('all');
            setSelectedCaps(new Set());
            setSearch('');
        }
        setOpen(v);
    };

    return (
        <TooltipProvider>
            <Popover open={open} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled || isLoading}
                        className="text-muted-foreground hover:text-foreground h-auto gap-2 px-2.5 py-1.5 text-sm font-normal"
                    >
                        {isLoading ? (
                            <span className="text-muted-foreground">...</span>
                        ) : selectedModel ? (
                            <>
                                <ProviderIcon developer={selectedModel.developer as ModelDeveloper} />
                                <span>{getModelName(selectedModel)}</span>
                            </>
                        ) : (
                            <span>{value}</span>
                        )}
                        <ChevronDown className="size-3.5 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-screen p-0 sm:w-fit" align="start">
                    {/* Search */}
                    <div className="flex items-center gap-2 border-b px-3 py-2.5">
                        <Search className="text-muted-foreground size-4 shrink-0" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('searchPlaceholder')}
                            className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
                        />
                        <CapabilityFilterButton
                            selected={selectedCaps}
                            onToggle={handleToggleCap}
                            onClear={() => setSelectedCaps(new Set())}
                        />
                    </div>
                    {/* Two-column layout */}
                    <div className="flex">
                        {selectedCaps.size === 0 && (
                            <DeveloperSidebar
                                developers={presentDevelopers}
                                selected={selectedDev}
                                onSelect={setSelectedDev}
                            />
                        )}
                        <ScrollArea className="max-h-[400px] min-w-0 flex-1">
                            <div className="py-1">
                                {showFavorites && (
                                    <>
                                        <SectionLabel>{t('favorites')}</SectionLabel>
                                        {favoritesInView.map((model) => (
                                            <ModelItem
                                                key={`fav-${model.id}`}
                                                model={model}
                                                name={getModelName(model)}
                                                descriptionShort={getModelDescriptionShort(model)}
                                                descriptionLong={getModelDescriptionLong(model)}
                                                devLabel={
                                                    DEVELOPER_META[model.developer as ModelDeveloper]?.label ??
                                                    model.developer
                                                }
                                                isSelected={model.id === value}
                                                isFavorite={true}
                                                selectedCaps={selectedCaps}
                                                onSelect={() => handleSelect(model.id)}
                                                onToggleFavorite={() => toggleFavorite(model.id)}
                                            />
                                        ))}
                                        <Separator className="my-1" />
                                    </>
                                )}
                                {displayed.length === 0 ? (
                                    <p className="text-muted-foreground py-6 text-center text-sm">{t('noResults')}</p>
                                ) : (
                                    displayed.map((model) => (
                                        <ModelItem
                                            key={model.id}
                                            model={model}
                                            name={getModelName(model)}
                                            descriptionShort={getModelDescriptionShort(model)}
                                            descriptionLong={getModelDescriptionLong(model)}
                                            devLabel={
                                                DEVELOPER_META[model.developer as ModelDeveloper]?.label ??
                                                model.developer
                                            }
                                            isSelected={model.id === value}
                                            isFavorite={isFavorite(model.id)}
                                            selectedCaps={selectedCaps}
                                            onSelect={() => handleSelect(model.id)}
                                            onToggleFavorite={() => toggleFavorite(model.id)}
                                        />
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </PopoverContent>
            </Popover>
        </TooltipProvider>
    );
}
