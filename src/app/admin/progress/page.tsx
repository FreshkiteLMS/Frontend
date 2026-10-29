"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { ProgressHub } from "@/components/admin/progress-hub";

export default function AdminProgressPage() {
    return (
        <>
            <Header />
            {/* useSearchParams needs a Suspense boundary for static prerendering. */}
            <Suspense>
                <ProgressHub />
            </Suspense>
        </>
    );
}
