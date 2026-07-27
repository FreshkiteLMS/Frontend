"use client";

import { useEffect, useRef } from 'react';
import { ALLOWED_REACTIONS, ANNOUNCEMENT_REACTIONS } from '@/types/chat';

interface ReactionPickerProps {
    onPick: (emoji: string) => void;
    onClose: () => void;
    /**
     * Announcement channels accept a narrower set (§5) — the server rejects the
     * others with a 400, so don't offer them here.
     */
    conversationType?: string;
}

/**
 * Small popover exposing the allowed reaction emojis. Closes on outside
 * mousedown or Escape.
 */
export function ReactionPicker({ onPick, onClose, conversationType }: ReactionPickerProps) {
    const ref = useRef<HTMLDivElement>(null);
    const reactions =
        conversationType === 'announcement' ? ANNOUNCEMENT_REACTIONS : ALLOWED_REACTIONS;

    useEffect(() => {
        const handleDown = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) onClose();
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handleDown);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleDown);
            document.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="flex items-center gap-1 p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
            {reactions.map((emoji) => (
                <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                        onPick(emoji);
                        onClose();
                    }}
                    className="w-9 h-9 flex items-center justify-center text-xl rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-transform hover:scale-125"
                    aria-label={`React with ${emoji}`}
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
}
