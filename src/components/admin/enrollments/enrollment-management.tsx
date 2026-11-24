"use client";

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ClipboardCheck, History, LayoutGrid, ListChecks, UserPlus } from 'lucide-react';
import { OverviewTab } from './overview-tab';
import { GrantAccessWizard } from './grant-access-wizard';
import { EnrollmentsTab } from './enrollments-tab';
import { AccessRequestsTab } from './access-requests-tab';
import { AuditLogTab } from './audit-log-tab';

type Tab = 'overview' | 'grant' | 'enrollments' | 'requests' | 'audit';
const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'grant', label: 'Grant Access', icon: UserPlus },
    { id: 'enrollments', label: 'Enrollments', icon: ListChecks },
    { id: 'requests', label: 'Access Requests', icon: ClipboardCheck },
    { id: 'audit', label: 'Audit Log', icon: History },
];
const isTab = (t: string | null): t is Tab => !!t && TABS.some(x => x.id === t);

/**
 * Admin → Enrollment Management. Tabs are linkable (`?tab=requests`), and
 * `?tab=grant&student=<userId>` opens the grant wizard for one student
 * (used from Student 360).
 */
export function EnrollmentManagement() {
    const router = useRouter();
    const params = useSearchParams();
    const [tab, setTab] = useState<Tab>(() => (isTab(params.get('tab')) ? (params.get('tab') as Tab) : 'overview'));
    const studentParam = params.get('student');
    // Bumped after any change so every tab refetches when shown.
    const [refreshKey, setRefreshKey] = useState(0);
    const changed = useCallback(() => setRefreshKey(k => k + 1), []);

    const go = (t: Tab) => {
        setTab(t);
        const q = new URLSearchParams();
        if (t !== 'overview') q.set('tab', t);
        router.replace(`/admin/enrollments${q.toString() ? `?${q}` : ''}`, { scroll: false });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ClipboardCheck className="w-6 h-6 text-blue-600" aria-hidden="true" /> Enrollment Management
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Grant course, bundle and Master Subscription access without payment, and review student access requests.</p>
            </div>

            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 mb-6 overflow-x-auto" role="tablist" aria-label="Enrollment management">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => go(t.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        <t.icon className="w-4 h-4" aria-hidden="true" /> {t.label}
                    </button>
                ))}
            </div>

            <div role="tabpanel">
                {tab === 'overview' && <OverviewTab refreshKey={refreshKey} onGoto={go} onChanged={changed} />}
                {tab === 'grant' && <GrantAccessWizard initialStudentId={studentParam} onGranted={changed} />}
                {tab === 'enrollments' && <EnrollmentsTab refreshKey={refreshKey} onChanged={changed} />}
                {tab === 'requests' && <AccessRequestsTab refreshKey={refreshKey} onChanged={changed} />}
                {tab === 'audit' && <AuditLogTab refreshKey={refreshKey} />}
            </div>
        </div>
    );
}
