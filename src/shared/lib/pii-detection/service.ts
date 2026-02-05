import 'server-only';
import { getServerConfig, type PiiType, PII_TYPES } from 'src/shared/config/env/server';
import { logger } from 'src/shared/lib/logger';
import { getOpenRouterClient, type ChatMessage } from 'src/shared/lib/openrouter';
import { buildDetectionPrompt, buildSystemPrompt } from './prompts';
import type { PiiDetectionResponse, PiiDetectionResult } from './types';

/**
 * PII Detection Service
 * Uses configured model via OpenRouter to detect PII in text
 */
class PiiDetectionService {
    private readonly model: string;
    private readonly timeoutMs: number;
    private readonly enabledPiiTypes: PiiType[];

    constructor() {
        const config = getServerConfig();
        this.model = config.piiDetection.model;
        this.timeoutMs = config.piiDetection.detectionTimeoutMs;
        this.enabledPiiTypes = config.piiDetection.piiTypes;
    }

    /**
     * Detect PII in accumulated text
     * @param text - Accumulated text to scan for PII
     * @returns Detection results with offsets and types
     */
    async detectPii(text: string): Promise<PiiDetectionResponse> {
        if (!text.trim()) {
            return { detections: [], success: true };
        }

        try {
            const detections = await this.callDetectionApi(text);
            return {
                detections,
                success: true,
            };
        } catch (error) {
            logger.error(
                {
                    error: error instanceof Error ? error.message : String(error),
                    textLength: text.length,
                },
                'PII detection failed',
            );
            return {
                detections: [],
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Call OpenRouter API for PII detection with timeout
     */
    private async callDetectionApi(text: string): Promise<PiiDetectionResult[]> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const client = getOpenRouterClient();
            const messages: ChatMessage[] = [
                {
                    role: 'system',
                    content: buildSystemPrompt(this.enabledPiiTypes),
                },
                {
                    role: 'user',
                    content: buildDetectionPrompt(text, this.enabledPiiTypes),
                },
            ];

            const response = await client.createChatCompletion(messages, {
                model: this.model,
                temperature: 0,
                max_tokens: 2000,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const content = response.choices[0]?.message?.content;

            if (!content) {
                logger.warn('PII detection returned empty content');
                return [];
            }

            return this.parseDetectionResponse(text, content);
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`PII detection timeout after ${this.timeoutMs}ms`);
            }
            throw error;
        }
    }

    /**
     * Parse LLM response into structured detection results
     */
    private parseDetectionResponse(originalText: string, llmResponse: string): PiiDetectionResult[] {
        try {
            // Extract JSON from response (may have markdown code blocks)
            let jsonStr = llmResponse.trim();
            const jsonMatch = jsonStr.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }

            const parsed = JSON.parse(jsonStr) as unknown;

            if (!Array.isArray(parsed)) {
                logger.warn({ response: llmResponse }, 'PII detection returned non-array response');
                return [];
            }

            const results: PiiDetectionResult[] = [];

            for (const item of parsed) {
                if (
                    typeof item === 'object' &&
                    item !== null &&
                    'piiType' in item &&
                    'startOffset' in item &&
                    'endOffset' in item &&
                    'placeholder' in item
                ) {
                    const piiType = String(item.piiType).toLowerCase() as PiiType;
                    const startOffset = Number(item.startOffset);
                    const endOffset = Number(item.endOffset);

                    // Validate PII type
                    if (!PII_TYPES.includes(piiType)) {
                        logger.warn({ piiType }, 'Invalid PII type detected, skipping');
                        continue;
                    }

                    // Validate offsets
                    if (
                        !Number.isInteger(startOffset) ||
                        !Number.isInteger(endOffset) ||
                        startOffset < 0 ||
                        endOffset <= startOffset ||
                        endOffset > originalText.length
                    ) {
                        logger.warn(
                            { startOffset, endOffset, textLength: originalText.length },
                            'Invalid offsets in PII detection, skipping',
                        );
                        continue;
                    }

                    results.push({
                        piiType,
                        startOffset,
                        endOffset,
                        placeholder: String(item.placeholder),
                        confidence: typeof item.confidence === 'number' ? item.confidence : undefined,
                    });
                }
            }

            // Sort by startOffset for consistent ordering
            results.sort((a, b) => a.startOffset - b.startOffset);

            // Remove overlapping detections (keep first one)
            const deduplicated: PiiDetectionResult[] = [];
            for (const detection of results) {
                const overlaps = deduplicated.some(
                    (existing) =>
                        (detection.startOffset < existing.endOffset && detection.endOffset > existing.startOffset) ||
                        (detection.startOffset === existing.startOffset && detection.endOffset === existing.endOffset),
                );

                if (!overlaps) {
                    deduplicated.push(detection);
                }
            }

            logger.debug(
                { count: deduplicated.length, types: deduplicated.map((d) => d.piiType) },
                'PII detection completed',
            );

            return deduplicated;
        } catch (error) {
            logger.error({ error, response: llmResponse }, 'Failed to parse PII detection response');
            return [];
        }
    }
}

// Singleton instance
let serviceInstance: PiiDetectionService | null = null;

/**
 * Get PII detection service instance
 */
export function getPiiDetectionService(): PiiDetectionService {
    if (!serviceInstance) {
        serviceInstance = new PiiDetectionService();
    }
    return serviceInstance;
}
