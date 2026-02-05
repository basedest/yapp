'use client';

import { useState, useCallback } from 'react';

type StreamEvent =
    | { type: 'content'; content: string }
    | { type: 'done'; userMessageId: string; assistantMessageId: string; totalTokens: number }
    | { type: 'error'; error: string }
    | { type: 'pii_mask'; startOffset: number; endOffset: number; piiType: string; originalLength: number };

export type PiiMaskRegion = {
    startOffset: number;
    endOffset: number;
    piiType: string;
    originalLength: number;
};

type StreamState = {
    isStreaming: boolean;
    streamingContent: string;
    error: string | null;
    piiMaskRegions: PiiMaskRegion[];
};

type SendMessageOptions = {
    conversationId: string;
    content: string;
    onChunk?: (content: string) => void;
    onComplete?: (data: { userMessageId: string; assistantMessageId: string; totalTokens: number }) => void;
    onError?: (error: string) => void;
    onPiiMask?: (region: PiiMaskRegion) => void;
};

export function useStreamMessage() {
    const [state, setState] = useState<StreamState>({
        isStreaming: false,
        streamingContent: '',
        error: null,
        piiMaskRegions: [],
    });

    const sendMessage = useCallback(
        async ({ conversationId, content, onChunk, onComplete, onError, onPiiMask }: SendMessageOptions) => {
            setState({
                isStreaming: true,
                streamingContent: '',
                error: null,
                piiMaskRegions: [],
            });

            try {
                const response = await fetch('/api/chat/stream', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ conversationId, content }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Failed to send message' }));
                    const errorMessage = errorData.error || 'Failed to send message';
                    setState({
                        isStreaming: false,
                        streamingContent: '',
                        error: errorMessage,
                        piiMaskRegions: [],
                    });
                    onError?.(errorMessage);
                    return;
                }

                if (!response.body) {
                    throw new Error('No response body');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let fullContent = '';

                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });

                    // Process complete SSE messages (separated by \n\n)
                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || ''; // Keep incomplete message in buffer

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            try {
                                const event: StreamEvent = JSON.parse(data);

                                if (event.type === 'content') {
                                    fullContent += event.content;
                                    setState((prev) => ({
                                        ...prev,
                                        streamingContent: fullContent,
                                    }));
                                    onChunk?.(event.content);
                                } else if (event.type === 'done') {
                                    setState({
                                        isStreaming: false,
                                        streamingContent: '',
                                        error: null,
                                        piiMaskRegions: [],
                                    });
                                    onComplete?.(event);
                                } else if (event.type === 'error') {
                                    setState({
                                        isStreaming: false,
                                        streamingContent: '',
                                        error: event.error,
                                        piiMaskRegions: [],
                                    });
                                    onError?.(event.error);
                                } else if (event.type === 'pii_mask') {
                                    // PII mask event - track mask regions for UI rendering
                                    const region: PiiMaskRegion = {
                                        startOffset: event.startOffset,
                                        endOffset: event.endOffset,
                                        piiType: event.piiType,
                                        originalLength: event.originalLength,
                                    };
                                    setState((prev) => ({
                                        ...prev,
                                        piiMaskRegions: [...prev.piiMaskRegions, region],
                                    }));
                                    onPiiMask?.(region);
                                }
                            } catch (e) {
                                console.error('Failed to parse SSE message:', e);
                            }
                        }
                    }
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
                setState({
                    isStreaming: false,
                    streamingContent: '',
                    error: errorMessage,
                    piiMaskRegions: [],
                });
                onError?.(errorMessage);
            }
        },
        [],
    );

    return {
        ...state,
        sendMessage,
    };
}
