"use client";

import { Header } from "@/components/layout/header";
import { EnrollmentRequests } from "@/components/admin/enrollment-requests";

export default function AdminEnrollmentRequestsPage() {
    return (
        <>
            <Header />
            <EnrollmentRequests />
        </>
    );
}
