"use client";

import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { ChatApp } from '@/components/chat/chat-app';

export default function ChatConversationPage() {
    const params = useParams<{ conversationId: string }>();
    const raw = params?.conversationId;
    const conversationId = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;

    return (
        <>
            <Header />
            <ChatApp conversationId={conversationId} />
        </>
    );
}
