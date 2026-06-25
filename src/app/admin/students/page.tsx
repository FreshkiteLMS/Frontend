"use client";

import { Header } from '@/components/layout/header';
import { StudentList } from '@/components/students/student-list';

export default function AdminStudentsPage() {
    return (
        <>
            <Header />
            <StudentList />
        </>
    );
}
