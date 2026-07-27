"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useChatStore } from '@/stores/chat-store';

interface TypingIndicatorProps {
    conversationId: string;
    /** `line` → subtitle text (chat header). `bubble` → animated dots row (message list). */
    variant?: 'line' | 'bubble';
    className?: string;
}

/** Typing entries older than this are considered stale and ignored. */
const STALE_MS = 6000;

function labelFor(names: string[]): string {
    if (names.length === 0) return '';
    if (names.length === 1) return `${names[0]} is typing…`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
    return `${names[0]} and ${names.length - 1} others are typing…`;
}

export function TypingIndicator({ conversationId, variant = 'line', className = '' }: TypingIndicatorProps) {
    const { user } = useAuth();
    const typingMap = useChatStore((s) => s.typing[conversationId]);
    const clearTyping = useChatStore((s) => s.clearTyping);
    const [, setTick] = useState(0);

    // Re-evaluate periodically so stale "typing" entries disappear on their own.
    useEffect(() => {
        if (!typingMap || Object.keys(typingMap).length === 0) return;
        const interval = setInterval(() => setTick((t) => t + 1), 1500);
        return () => clearInterval(interval);
    }, [typingMap]);

    // Prune expired entries from the store (keeps the map from growing).
    useEffect(() => {
        if (!typingMap) return;
        const now = Date.now();
        for (const [userId, info] of Object.entries(typingMap)) {
            if (now - info.at > STALE_MS) clearTyping(conversationId, userId);
        }
    });

    const now = Date.now();
    const names = Object.entries(typingMap || {})
        .filter(([userId, info]) => userId !== user?.id && now - info.at <= STALE_MS)
        .map(([, info]) => info.name || 'Someone');

    if (names.length === 0) return null;

    if (variant === 'bubble') {
        return (
            <div className={`flex items-center gap-2 px-2 py-1 ${className}`}>
                <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:300ms]" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{labelFor(names)}</span>
            </div>
        );
    }

    return (
        <span className={`text-xs text-blue-600 dark:text-blue-400 font-medium truncate ${className}`}>
            {labelFor(names)}
        </span>
    );
}
