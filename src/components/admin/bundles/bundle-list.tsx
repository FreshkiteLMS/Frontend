"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, BookOpen, Eye, EyeOff, Layers, Package, Pencil, Plus, Search, ShoppingBag, TicketPercent, Trash2 } from 'lucide-react';
import { courseGroupService } from '@/services/api/courseGroupService';
import { apiErrorMessage } from '@/services/api/discount.api';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { CourseGroup } from '@/types/course';

const inr = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(n || 0);

/** Admin overview of every bundle (published and hidden). */
export function BundleList() {
    const router = useRouter();
    const [groups, setGroups] = useState<CourseGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<CourseGroup | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setGroups(await courseGroupService.getAllGroups());
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not load bundles.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return groups.filter((g) => (status === 'all' || g.status === status) && (!q || g.name.toLowerCase().includes(q)));
    }, [groups, query, status]);

    const togglePublish = async (g: CourseGroup) => {
        const next = g.status === 'active' ? 'inactive' : 'active';
        if (next === 'active' && !g.course_count) {
            toast.error('Add at least one course before publishing.');
            return;
        }
        setBusyId(g._id);
        try {
            const saved = await courseGroupService.saveBundle(g._id, { status: next });
            setGroups((gs) => gs.map((x) => (x._id === g._id ? { ...x, status: saved.status, updated_at: saved.updated_at } : x)));
            toast.success(next === 'active' ? `${g.name} is now published` : `${g.name} is now hidden from the store`);
        } catch (err) {
            toast.error(apiErrorMessage(err));
        } finally {
            setBusyId(null);
        }
    };

    const confirmDelete = async () => {
        if (!deleting) return;
        setBusyId(deleting._id);
        try {
            await courseGroupService.deleteGroup(deleting._id);
            setGroups((gs) => gs.filter((g) => g._id !== deleting._id));
            toast.success('Bundle deleted');
            setDeleting(null);
        } catch (err) {
            toast.error(apiErrorMessage(err), { duration: 7000 });
            setDeleting(null);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button onClick={() => router.push('/admin')} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bundles</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Manage course bundles, their courses and the order students take them in.</p>
                </div>
                <Link href="/admin/bundles/new" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors">
                    <Plus className="w-4 h-4" /> New bundle
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search bundles" aria-label="Search bundles"
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div role="tablist" aria-label="Filter by visibility" className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-white dark:bg-gray-800">
                    {(['all', 'active', 'inactive'] as const).map((s) => (
                        <button key={s} role="tab" aria-selected={status === s} onClick={() => setStatus(s)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${status === s ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                            {s === 'all' ? 'All' : s === 'active' ? 'Published' : 'Hidden'}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300">
                    {error}<button onClick={load} className="font-semibold underline">Retry</button>
                </div>
            )}

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((i) => <div key={i} className="h-56 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
                </div>
            ) : shown.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-16 text-center">
                    <Package className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="font-semibold text-gray-900 dark:text-white">{groups.length ? 'No bundles match' : 'No bundles yet'}</p>
                    {!groups.length && (
                        <Link href="/admin/bundles/new" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Create a bundle</Link>
                    )}
                </div>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {shown.map((g) => (
                        <li key={g._id} className="flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="relative h-28 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
                                {g.image_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={g.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                                )}
                                <span className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${g.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-gray-900/70 text-gray-100'}`}>
                                    {g.status === 'active' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                    {g.status === 'active' ? 'Published' : 'Hidden'}
                                </span>
                                <Layers className="absolute right-4 bottom-3 w-8 h-8 text-white/20" aria-hidden="true" />
                            </div>
                            <div className="flex-1 p-4">
                                <Link href={`/admin/bundles/${g._id}`} className="font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2">{g.name}</Link>
                                <p className="mt-1 text-lg font-black text-gray-900 dark:text-white tabular-nums">{inr(g.price)}</p>
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {g.course_count ?? 0} course{g.course_count === 1 ? '' : 's'}</span>
                                    <span className="inline-flex items-center gap-1"><ShoppingBag className="w-3.5 h-3.5" /> {g.purchase_count ?? 0} purchase{g.purchase_count === 1 ? '' : 's'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 border-t border-gray-100 dark:border-gray-800 px-2 py-2">
                                <Link href={`/admin/bundles/${g._id}`} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                                    <Pencil className="w-4 h-4" /> Edit
                                </Link>
                                <button onClick={() => togglePublish(g)} disabled={busyId === g._id}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50">
                                    {g.status === 'active' ? <><EyeOff className="w-4 h-4" /> Unpublish</> : <><Eye className="w-4 h-4" /> Publish</>}
                                </button>
                                <Link href={`/admin/discounts?create=${encodeURIComponent(`BUNDLE:${g._id}`)}`} aria-label={`Create a discount for ${g.name}`} title="Create discount"
                                    className="p-2 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20">
                                    <TicketPercent className="w-4 h-4" />
                                </Link>
                                <button onClick={() => setDeleting(g)} aria-label={`Delete ${g.name}`} title="Delete"
                                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <ConfirmDialog
                open={!!deleting}
                title={`Delete “${deleting?.name ?? ''}”?`}
                message={deleting?.purchase_count
                    ? <>Students have bought this bundle, so it can’t be deleted without removing their access. <strong>Unpublish it instead</strong> — it disappears from the store and buyers keep their courses.</>
                    : <>The bundle is removed permanently. Its courses are not deleted.</>}
                confirmLabel={deleting?.purchase_count ? 'Unpublish instead' : 'Delete bundle'}
                tone={deleting?.purchase_count ? 'primary' : 'danger'}
                busy={!!deleting && busyId === deleting._id}
                onConfirm={() => {
                    if (deleting?.purchase_count) {
                        const g = deleting;
                        setDeleting(null);
                        if (g.status === 'active') togglePublish(g); else toast('This bundle is already hidden.');
                    } else confirmDelete();
                }}
                onCancel={() => setDeleting(null)}
            />
        </div>
    );
}
