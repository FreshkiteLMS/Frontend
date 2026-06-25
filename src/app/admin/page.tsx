"use client";

import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { Header } from '@/components/layout/header';

export default function AdminPage() {
    return (
        <>
            <Header />
            <AdminDashboard />
        </>
    );
}
