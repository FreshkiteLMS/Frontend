"use client";

import { Header } from '@/components/layout/header';
import { AccessRequestsPage } from '@/components/students/access-requests-page';

export default function StudentAccessRequestsPage() {
    return (
        <>
            <Header />
            <AccessRequestsPage />
        </>
    );
}
