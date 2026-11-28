"use client";

import { use } from 'react';
import { Header } from '@/components/layout/header';
import { MentorDetail } from '@/components/mentors/mentor-detail';

export default function MentorDetailPage({ params }: { params: Promise<{ mentorId: string }> }) {
    const { mentorId } = use(params);
    return (
        <>
            <Header />
            <MentorDetail mentorId={mentorId} />
        </>
    );
}
