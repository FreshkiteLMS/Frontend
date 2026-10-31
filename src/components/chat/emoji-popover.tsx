"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { EmojiStyle, SuggestionMode, Theme, type EmojiClickData } from 'emoji-picker-react';
import { Loader2 } from 'lucide-react';

// The picker (and its emoji data) loads only when first opened.
const Picker = dynamic(() => import('emoji-picker-react'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center w-full h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
    ),
});

const WIDTH = 352;
const HEIGHT = 420;
const GAP = 8;
const MOBILE_BREAKPOINT = 640;

interface EmojiPopoverProps {
    /** Element the popover is positioned against. */
    anchorRef: RefObject<HTMLElement | null>;
    onPick: (emoji: string) => void;
    onClose: () => void;
    /** Keep open after a pick (composer) or close (reactions). */
    closeOnPick?: boolean;
}

function isDark(): boolean {
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

/**
 * Full emoji picker in a popover that always fits on screen: positioned above
 * or below its anchor (whichever has room) and clamped horizontally on
 * desktop, a bottom sheet on phones. Search matches emoji names and keywords;
 * recently used emojis are remembered by the picker.
 */
export function EmojiPopover({ anchorRef, onPick, onClose, closeOnPick = false }: EmojiPopoverProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const [mobile, setMobile] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    useLayoutEffect(() => {
        const place = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            if (vw < MOBILE_BREAKPOINT) {
                setMobile(true);
                setPos(null);
                return;
            }
            setMobile(false);
            const rect = anchorRef.current?.getBoundingClientRect();
            if (!rect) return;
            const above = rect.top - GAP - HEIGHT;
            const below = rect.bottom + GAP;
            const top = above >= GAP ? above : Math.min(below, vh - HEIGHT - GAP);
            const left = Math.min(Math.max(GAP, rect.left + rect.width / 2 - WIDTH / 2), vw - WIDTH - GAP);
            setPos({ top: Math.max(GAP, top), left });
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [anchorRef]);

    useEffect(() => {
        const onDown = (e: MouseEvent | TouchEvent) => {
            const t = e.target as Node;
            if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
            onClose();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [anchorRef, onClose]);

    if (!mounted) return null;

    const picker = (
        <Picker
            onEmojiClick={(data: EmojiClickData) => {
                onPick(data.emoji);
                if (closeOnPick) onClose();
            }}
            theme={isDark() ? Theme.DARK : Theme.LIGHT}
            emojiStyle={EmojiStyle.NATIVE}
            suggestedEmojisMode={SuggestionMode.RECENT}
            lazyLoadEmojis
            autoFocusSearch={!mobile}
            searchPlaceholder="Search emoji"
            previewConfig={{ showPreview: false }}
            width="100%"
            height="100%"
        />
    );

    return createPortal(
        mobile ? (
            <div className="fixed inset-0 z-[90] flex items-end bg-black/30" role="dialog" aria-label="Emoji picker">
                <div ref={panelRef} className="w-full h-[55vh] rounded-t-2xl overflow-hidden shadow-2xl bg-white dark:bg-gray-900">
                    {picker}
                </div>
            </div>
        ) : (
            <div
                ref={panelRef}
                role="dialog"
                aria-label="Emoji picker"
                className="fixed z-[90] rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700"
                style={{ width: WIDTH, height: HEIGHT, top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            >
                {picker}
            </div>
        ),
        document.body
    );
}
