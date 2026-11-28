"use client";

import { Header } from '@/components/layout/header';
import { MentorCreate } from '@/components/mentors/mentor-create';

export default function NewMentorPage() {
    return (
        <>
            <Header />
            <MentorCreate />
        </>
    );
}
