'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { cn } from 'src/shared/lib/utils';
import { trpc } from 'src/shared/api/trpc/client';

export type PiiMaskRegion = {
    startOffset: number;
    endOffset: number;
    piiType: string;
    originalLength: number;
};

type PiiMaskProps = {
    text: string;
    maskRegions: PiiMaskRegion[];
    className?: string;
    messageId?: string; // Optional: for logging unmask actions (AC4, NFR3)
};

/**
 * PII Mask Component
 * Renders text with masked PII regions that can be revealed on click
 * Supports retroactive masking with fade/blur animation
 * Logs unmask actions for audit when messageId is provided (AC4)
 */
export function PiiMask({ text, maskRegions, className, messageId }: PiiMaskProps) {
    const [revealedRegions, setRevealedRegions] = useState<Set<string>>(new Set());
    const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
    const [newlyMaskedRegions, setNewlyMaskedRegions] = useState<Set<string>>(new Set());
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousRegionsRef = useRef<PiiMaskRegion[]>([]);

    // Unmask logging mutation (AC4, NFR3)
    const logUnmaskMutation = trpc.piiDetection.logUnmask.useMutation();

    // Track newly added regions for retroactive masking animation
    useEffect(() => {
        const previousKeys = new Set(previousRegionsRef.current.map((r) => `${r.startOffset}-${r.endOffset}`));
        const currentKeys = new Set(maskRegions.map((r) => `${r.startOffset}-${r.endOffset}`));
        const newKeys = new Set([...currentKeys].filter((key) => !previousKeys.has(key)));

        previousRegionsRef.current = maskRegions;

        if (newKeys.size > 0) {
            setNewlyMaskedRegions(newKeys);
            // Clear animation state after animation completes (250ms)
            const timeout = setTimeout(() => {
                setNewlyMaskedRegions(new Set());
            }, 250);
            return () => clearTimeout(timeout);
        }
    }, [maskRegions]);

    const toggleReveal = useCallback(
        (regionKey: string, piiType: string) => {
            // Clear any existing timeout
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }

            // Debounce rapid clicks (100ms)
            debounceTimeoutRef.current = setTimeout(() => {
                setRevealedRegions((prev) => {
                    const next = new Set(prev);
                    const isRevealing = !next.has(regionKey);

                    if (next.has(regionKey)) {
                        next.delete(regionKey);
                    } else {
                        next.add(regionKey);
                    }

                    // Log unmask action for audit (AC4, NFR3)
                    // Only log reveal actions (not hide) and only if messageId is provided
                    if (isRevealing && messageId) {
                        logUnmaskMutation.mutate(
                            {
                                messageId,
                                piiType,
                                action: 'reveal',
                            },
                            {
                                // Silent error handling - don't break UI on logging failures
                                onError: () => {
                                    // Gracefully ignore logging errors (NFR2)
                                },
                            },
                        );
                    }

                    return next;
                });
            }, 100);
        },
        [messageId, logUnmaskMutation],
    );

    // Sort regions by start offset
    const sortedRegions = useMemo(() => [...maskRegions].sort((a, b) => a.startOffset - b.startOffset), [maskRegions]);

    // Build rendered content with masked regions
    const renderedContent = useMemo(() => {
        if (sortedRegions.length === 0) {
            return <span>{text}</span>;
        }

        const parts: Array<{ text: string; isMasked: boolean; regionKey: string | null }> = [];
        let lastIndex = 0;

        for (const region of sortedRegions) {
            // Add text before this region
            if (region.startOffset > lastIndex) {
                parts.push({
                    text: text.slice(lastIndex, region.startOffset),
                    isMasked: false,
                    regionKey: null,
                });
            }

            // Add masked region
            const maskedText = text.slice(region.startOffset, region.endOffset);
            const regionKey = `${region.startOffset}-${region.endOffset}`;
            parts.push({
                text: maskedText,
                isMasked: true,
                regionKey,
            });

            lastIndex = region.endOffset;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            parts.push({
                text: text.slice(lastIndex),
                isMasked: false,
                regionKey: null,
            });
        }

        return (
            <>
                {parts.map((part, index) => {
                    if (!part.isMasked || !part.regionKey) {
                        return <span key={index}>{part.text}</span>;
                    }

                    const isRevealed = revealedRegions.has(part.regionKey);
                    const isHovered = hoveredRegion === part.regionKey;
                    const isNewlyMasked = newlyMaskedRegions.has(part.regionKey);

                    return (
                        <span
                            key={index}
                            className={cn(
                                'inline-block cursor-pointer transition-all duration-200 select-none',
                                // Retroactive masking animation
                                isNewlyMasked && ['animate-pulse'],
                                // Default state: blur with distinct background
                                !isRevealed && [
                                    'blur-sm',
                                    'bg-muted/50',
                                    'px-1',
                                    'rounded',
                                    'border',
                                    'border-border/50',
                                ],
                                // Hover state: pointer, highlight
                                isHovered && !isRevealed && ['bg-muted', 'border-border', 'scale-105'],
                                // Revealed state: no blur
                                isRevealed && ['blur-0', 'bg-transparent', 'border-transparent'],
                            )}
                            onClick={() => {
                                const region = maskRegions.find(
                                    (r) => `${r.startOffset}-${r.endOffset}` === part.regionKey,
                                );
                                toggleReveal(part.regionKey!, region?.piiType ?? 'unknown');
                            }}
                            onMouseEnter={() => setHoveredRegion(part.regionKey)}
                            onMouseLeave={() => setHoveredRegion(null)}
                            title={
                                isRevealed
                                    ? 'Click to hide'
                                    : `Click to reveal ${maskRegions.find((r) => `${r.startOffset}-${r.endOffset}` === part.regionKey)?.piiType ?? 'PII'}`
                            }
                        >
                            {part.text}
                        </span>
                    );
                })}
            </>
        );
    }, [text, sortedRegions, revealedRegions, hoveredRegion, newlyMaskedRegions, maskRegions, toggleReveal]);

    return <span className={className}>{renderedContent}</span>;
}
