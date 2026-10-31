"use client";

import type { ReactNode } from 'react';
import { useChatSocket } from '@/hooks/use-chat-socket';

/**
 * Keeps the realtime connection (chat, presence, notifications, course-access
 * changes) alive on every page for the signed-in user. Mounted once in the
 * root layout so navbar badges and access updates never depend on the chat
 * page being open. Renders nothing of its own.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
    useChatSocket();
    return <>{children}</>;
}
