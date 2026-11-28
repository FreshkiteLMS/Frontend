"use client";

import { Header } from '@/components/layout/header';
import { MentorManagement } from '@/components/mentors/mentor-management';

export default function AdminMentorsPage() {
    return (
        <>
            <Header />
            <MentorManagement />
        </>
    );
}
