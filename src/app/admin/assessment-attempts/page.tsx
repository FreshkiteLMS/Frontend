"use client";

import { Header } from '@/components/layout/header';
import { AttemptManagement } from '@/components/admin/assessment-attempts/AttemptManagement';

export default function AssessmentAttemptsPage() {
    return (
        <>
            <Header />
            <AttemptManagement />
        </>
    );
}
