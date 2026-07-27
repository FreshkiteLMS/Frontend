"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Clock, Loader2, Megaphone, MessageSquarePlus, Plus, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useChatSocket } from '@/hooks/use-chat-socket';
import { useChatShortcuts } from '@/hooks/use-chat-shortcuts';
import { ShortcutsHelp } from '@/components/chat/shortcuts-help';
import { useChatStore } from '@/stores/chat-store';
import { ChatConversation } from '@/types/chat';
import { ChatWindow } from '@/components/chat/chat-window';
import { GroupInfoPanel } from '@/components/chat/group-info-panel';
import { CreateGroupModal } from '@/components/chat/create-group-modal';
import { BulkMessageModal } from '@/components/chat/bulk-message-modal';
import { ScheduledMessagesModal } from '@/components/chat/scheduled-messages-modal';
import { ConversationList } from '@/components/chat/conversation-list';
import { ChatEmptyState } from '@/components/chat/chat-empty-state';
import { NewChatModal } from '@/components/chat/new-chat-modal';

export function ChatApp({ conversationId }: { conversationId?: string }) {
    useChatSocket();

    const router = useRouter();
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
    const [fabOpen, setFabOpen] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showBulk, setShowBulk] = useState(false);
    const [showScheduled, setShowScheduled] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const activeConversationId = useChatStore((s) => s.activeConversationId);
    const activeConversation = useChatStore((s) =>
        s.activeConversationId ? s.conversations[s.activeConversationId] : undefined
    );
    const openConversation = useChatStore((s) => s.openConversation);
    const loadConversations = useChatStore((s) => s.loadConversations);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Load the conversation index once the user is known.
    useEffect(() => {
        if (!user?.id) return;
        loadConversations().catch((err: unknown) => {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            toast.error(e?.response?.data?.message || e?.message || 'Failed to load conversations');
        });
    }, [user?.id, loadConversations]);

    // Sync active conversation with the route param.
    useEffect(() => {
        void openConversation(conversationId ?? null);
    }, [conversationId, openConversation]);

    // Close the info drawer whenever the active conversation changes.
    useEffect(() => {
        setInfoOpen(false);
    }, [activeConversationId]);

    // Close the floating-action menu on outside click.
    useEffect(() => {
        if (!fabOpen) return;
        const handler = (event: MouseEvent) => {
            if (!(event.target as Element).closest('.chat-fab-menu')) setFabOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [fabOpen]);

    const handleSelect = useCallback((id: string) => {
        void openConversation(id);
        router.push(`/chat/${id}`);
    }, [openConversation, router]);

    const handleBack = useCallback(() => {
        void openConversation(null);
        router.push('/chat');
    }, [openConversation, router]);

    const handleOpenConversation = useCallback((id: string) => {
        setShowNewChat(false);
        if (!id) { toast.error('Could not open the conversation'); return; }
        void openConversation(id);
        router.push(`/chat/${id}`);
    }, [openConversation, router]);

    const handleGroupCreated = useCallback((c: ChatConversation) => {
        setShowCreateGroup(false);
        useChatStore.getState().upsertConversation(c);
        void openConversation(c.id);
        router.push(`/chat/${c.id}`);
    }, [openConversation, router]);

    // Step to the conversation `delta` positions away in the current list order.
    const stepConversation = useCallback((delta: number) => {
        const order = useChatStore.getState().conversationOrder;
        if (!order.length) return;
        const current = useChatStore.getState().activeConversationId;
        const idx = current ? order.indexOf(current) : -1;
        const next = idx === -1
            ? (delta > 0 ? order[0] : order[order.length - 1])
            : order[Math.min(order.length - 1, Math.max(0, idx + delta))];
        if (next && next !== current) handleSelect(next);
    }, [handleSelect]);

    const focusSearch = useCallback(() => {
        const el = document.querySelector<HTMLInputElement>('[data-chat-search-input]');
        if (el) { el.focus(); el.select(); }
    }, []);

    useChatShortcuts({
        onSearch: focusSearch,
        onNewChat: () => setShowNewChat(true),
        onNextConversation: () => stepConversation(1),
        onPrevConversation: () => stepConversation(-1),
        onToggleHelp: () => setShowHelp((v) => !v),
        onEscape: () => {
            if (showHelp) setShowHelp(false);
            else if (infoOpen) setInfoOpen(false);
        },
    });

    const isAdmin = mounted && user?.role === 'admin';
    const hasActive = Boolean(activeConversationId);

    return (
        <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-gray-50 dark:bg-gray-950">
            {/* List pane */}
            <div
                className={`${hasActive ? 'hidden md:flex' : 'flex'} relative w-full md:w-[360px] lg:w-[400px] flex-col min-h-0 md:border-r md:border-gray-200 md:dark:border-gray-800 bg-white dark:bg-gray-900`}
            >
                <ConversationList onSelect={handleSelect} />

                {/* Floating new-chat button + menu */}
                <div className="chat-fab-menu absolute bottom-5 right-5 z-40">
                    {fabOpen && (
                        <div className="absolute bottom-16 right-0 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <FabMenuItem
                                icon={MessageSquarePlus}
                                label="New chat"
                                onClick={() => { setFabOpen(false); setShowNewChat(true); }}
                            />
                            <FabMenuItem
                                icon={Users}
                                label="New group"
                                onClick={() => { setFabOpen(false); setShowCreateGroup(true); }}
                            />
                            {isAdmin && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                                    <FabMenuItem
                                        icon={Megaphone}
                                        label="Bulk message"
                                        onClick={() => { setFabOpen(false); setShowBulk(true); }}
                                    />
                                    <FabMenuItem
                                        icon={Clock}
                                        label="Scheduled messages"
                                        onClick={() => { setFabOpen(false); setShowScheduled(true); }}
                                    />
                                </>
                            )}
                        </div>
                    )}
                    <button
                        onClick={() => setFabOpen((o) => !o)}
                        className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-colors"
                        aria-label="Start a new chat"
                    >
                        <Plus className={`w-6 h-6 transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Window pane */}
            <div className={`${hasActive ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0 min-h-0 bg-gray-50 dark:bg-gray-950`}>
                {activeConversation ? (
                    <ChatWindow
                        conversation={activeConversation}
                        onBack={handleBack}
                        onOpenInfo={() => setInfoOpen(true)}
                    />
                ) : hasActive ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    </div>
                ) : (
                    <ChatEmptyState />
                )}
            </div>

            {/* Info drawer */}
            {infoOpen && activeConversation && (
                <GroupInfoPanel
                    conversation={activeConversation}
                    onClose={() => setInfoOpen(false)}
                />
            )}

            {/* Modals */}
            {showNewChat && (
                <NewChatModal
                    onClose={() => setShowNewChat(false)}
                    onOpenConversation={handleOpenConversation}
                />
            )}
            {showCreateGroup && (
                <CreateGroupModal
                    onClose={() => setShowCreateGroup(false)}
                    onCreated={handleGroupCreated}
                />
            )}
            {showBulk && <BulkMessageModal onClose={() => setShowBulk(false)} />}
            {showScheduled && <ScheduledMessagesModal onClose={() => setShowScheduled(false)} />}
            {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}
        </div>
    );
}

function FabMenuItem({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2 transition-colors"
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}
