"use client";

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Old bundle editor URL — kept so bookmarks and links still work. */
function Redirect() {
    const router = useRouter();
    const id = useSearchParams().get('id');
    useEffect(() => {
        router.replace(id ? `/admin/bundles/${encodeURIComponent(id)}` : '/admin/bundles/new');
    }, [id, router]);
    return <div className="text-center py-12 text-gray-500">Opening the bundle editor…</div>;
}

export default function CreateCourseGroupPage() {
    return (
        <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <Redirect />
        </Suspense>
    );
}
