"use client";

import { Header } from '@/components/layout/header';
import { StudentMeetings } from '@/components/meetings/student-meetings';

export default function StudentMeetingsPage() {
    return (
        <>
            <Header />
            <StudentMeetings />
        </>
    );
}
