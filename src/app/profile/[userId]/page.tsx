"use client";

import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { ProfileView } from '@/components/chat/profile-view';

export default function ChatProfilePage() {
    const params = useParams<{ userId: string }>();
    const raw = params?.userId;
    const userId = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';

    return (
        <>
            <Header />
            <ProfileView userId={userId} />
        </>
    );
}
