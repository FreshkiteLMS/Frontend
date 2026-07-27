"use client";

import { useEffect } from 'react';

export interface ChatShortcutHandlers {
    /** Focus the conversation search input (the "/" and Ctrl/Cmd+K shortcut). */
    onSearch?: () => void;
    /** Start a new chat (Ctrl/Cmd+N). */
    onNewChat?: () => void;
    /** Move to the next conversation in the list (Alt+ArrowDown). */
    onNextConversation?: () => void;
    /** Move to the previous conversation in the list (Alt+ArrowUp). */
    onPrevConversation?: () => void;
    /** Close the open pane / go back (Escape). */
    onEscape?: () => void;
    /** Toggle the shortcuts cheatsheet (Shift+? ). */
    onToggleHelp?: () => void;
}

/**
 * Returns true when the event originates from an editable surface, so global
 * single-key shortcuts don't fire while the user is typing a message.
 */
function isTypingTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable === true
    );
}

/**
 * Global keyboard shortcuts for the chat surface (§29).
 *
 * Chord shortcuts (Ctrl/Cmd+K, Ctrl/Cmd+N) work everywhere, including while
 * composing. Single-key shortcuts ("/", "j"/"k", "?") are suppressed while the
 * focus is in a text field so they never eat what the user is typing.
 */
export function useChatShortcuts(handlers: ChatShortcutHandlers): void {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const mod = e.ctrlKey || e.metaKey;
            const typing = isTypingTarget(e.target);

            // Chords — always active.
            if (mod && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                handlers.onSearch?.();
                return;
            }
            if (mod && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                handlers.onNewChat?.();
                return;
            }

            // Alt+Arrow conversation navigation — active even while composing so
            // power users can switch chats without leaving the keyboard.
            if (e.altKey && e.key === 'ArrowDown') {
                e.preventDefault();
                handlers.onNextConversation?.();
                return;
            }
            if (e.altKey && e.key === 'ArrowUp') {
                e.preventDefault();
                handlers.onPrevConversation?.();
                return;
            }

            // Escape closes panes / clears (never prevented — inputs may want it too).
            if (e.key === 'Escape') {
                handlers.onEscape?.();
                return;
            }

            // Single-key shortcuts — only when not typing.
            if (typing || e.altKey || mod) return;

            if (e.key === '/') {
                e.preventDefault();
                handlers.onSearch?.();
            } else if (e.key === '?') {
                e.preventDefault();
                handlers.onToggleHelp?.();
            } else if (e.key === 'j') {
                e.preventDefault();
                handlers.onNextConversation?.();
            } else if (e.key === 'k') {
                e.preventDefault();
                handlers.onPrevConversation?.();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handlers]);
}

/** The list rendered by the help overlay. Single source of truth for the cheatsheet. */
export const CHAT_SHORTCUTS: { keys: string; label: string }[] = [
    { keys: 'Ctrl/⌘ K', label: 'Search conversations' },
    { keys: '/', label: 'Search conversations' },
    { keys: 'Ctrl/⌘ N', label: 'New chat' },
    { keys: 'j  /  Alt ↓', label: 'Next conversation' },
    { keys: 'k  /  Alt ↑', label: 'Previous conversation' },
    { keys: 'Enter', label: 'Send message' },
    { keys: 'Shift Enter', label: 'New line' },
    { keys: 'Esc', label: 'Close panel / back' },
    { keys: '?', label: 'Toggle this help' },
];
