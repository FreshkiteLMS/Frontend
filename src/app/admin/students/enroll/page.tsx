"use client";

import { StudentEnrollment } from '@/components/students/student-enrollment';
import { Header } from '@/components/layout/header';

export default function EnrollPage() {
    return (
        <>
            <Header />
            <StudentEnrollment />
        </>
    );
}
