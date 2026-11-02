"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    ArrowLeft, BarChart3, BookOpen, ChevronLeft, ChevronRight, Copy, Crown, Layers, Pencil, Plus, Power, Search,
    TicketPercent, Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DiscountForm } from './discount-form';
import { DiscountUsage } from './discount-usage';
import { formatPaise } from '@/lib/money';
import {
    discountService,
    apiErrorMessage,
    type AdminDiscount,
    type DiscountProduct,
    type DiscountState,
} from '@/services/api/discount.api';

const STATE_BADGE: Record<DiscountState, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-500/30' },
    scheduled: { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-500/30' },
    inactive: { label: 'Inactive', cls: 'bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-600/40' },
    expired: { label: 'Expired', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-500/30' },
    exhausted: { label: 'Limit reached', cls: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-900/30 dark:text-orange-400 dark:ring-orange-500/30' },
    archived: { label: 'Archived', cls: 'bg-gray-100 text-gray-500 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-500 dark:ring-gray-600/40' },
};

const SORTS = [
    { value: 'created_at:desc', label: 'Newest first' },
    { value: 'created_at:asc', label: 'Oldest first' },
    { value: 'usage_count:desc', label: 'Most used' },
    { value: 'usage_count:asc', label: 'Least used' },
];

const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const valueLabel = (d: AdminDiscount) => d.discount_type === 'percentage' ? `${d.value}%` : formatPaise(Math.round(d.value * 100));

export function DiscountManager() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [rows, setRows] = useState<AdminDiscount[]>([]);
    const [meta, setMeta] = useState<{ page: number; totalPages: number; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [query, setQuery] = useState('');
    const [q, setQ] = useState('');
    // Deep links from other admin screens: ?product=<filter> and ?create=<productKey>.
    const [product, setProduct] = useState(() => searchParams.get('product') ?? '');
    const [status, setStatus] = useState('');
    const [sort, setSort] = useState(SORTS[0].value);
    const [page, setPage] = useState(1);
    const [bundles, setBundles] = useState<DiscountProduct[]>([]);
    const [courses, setCourses] = useState<DiscountProduct[]>([]);

    const [formOpen, setFormOpen] = useState(() => !!searchParams.get('create'));
    const [initialProduct, setInitialProduct] = useState<string | null>(() => searchParams.get('create'));
    const [editing, setEditing] = useState<AdminDiscount | null>(null);
    const [usageFor, setUsageFor] = useState<AdminDiscount | null>(null);
    const [deleting, setDeleting] = useState<AdminDiscount | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    // Debounced search.
    useEffect(() => {
        const t = window.setTimeout(() => { setQ(query.trim()); setPage(1); }, 300);
        return () => window.clearTimeout(t);
    }, [query]);

    useEffect(() => {
        discountService.products().then((p) => { setBundles(p.bundles); setCourses(p.courses); }).catch(() => undefined);
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [field, order] = sort.split(':');
            const res = await discountService.list({ q: q || undefined, product: product || undefined, status: status || undefined, sort: field, order: order as 'asc' | 'desc', page, limit: 10 });
            setRows(res.data);
            setMeta(res.meta);
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not load discounts.'));
        } finally {
            setLoading(false);
        }
    }, [q, product, status, sort, page]);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => { setEditing(null); setInitialProduct(null); setFormOpen(true); };
    const openEdit = (d: AdminDiscount) => { setEditing(d); setFormOpen(true); };
    const closeForm = () => {
        setFormOpen(false);
        // Drop ?create= so a refresh doesn't reopen the form.
        if (searchParams.get('create')) router.replace('/admin/discounts');
    };

    const toggle = async (d: AdminDiscount) => {
        setBusyId(d._id);
        try {
            const updated = await discountService.setActive(d._id, !d.is_active);
            setRows((rs) => rs.map((r) => (r._id === d._id ? updated : r)));
            toast.success(updated.is_active ? `${d.code} activated` : `${d.code} deactivated`);
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
            const { mode } = await discountService.remove(deleting._id);
            toast.success(mode === 'archived'
                ? `${deleting.code} archived — it has checkout history, so it was kept for records and deactivated.`
                : `${deleting.code} deleted`);
            setDeleting(null);
            load();
        } catch (err) {
            toast.error(apiErrorMessage(err));
        } finally {
            setBusyId(null);
        }
    };

    const copyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            toast.success(`Copied ${code}`);
        } catch {
            toast.error('Could not copy');
        }
    };

    const filtersActive = !!(q || product || status);
    const archivedView = status === 'archived';

    const productCell = (d: AdminDiscount) => (
        <span className="inline-flex items-center gap-1.5 min-w-0">
            {d.applicable_to === 'ALL_IN_ONE'
                ? <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-label="Master Plan" />
                : d.applicable_to === 'COURSE'
                    ? <BookOpen className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-label="Course" />
                    : <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" aria-label="Bundle" />}
            <span className={`truncate ${d.product.exists ? '' : 'italic text-gray-400'}`}>
                {d.applicable_to === 'ALL_IN_ONE' ? 'Master Plan' : d.product.name}
            </span>
        </span>
    );

    const actions = (d: AdminDiscount) => (
        <div className="flex items-center justify-end gap-0.5">
            <IconButton label={`Usage for ${d.code}`} onClick={() => setUsageFor(d)}><BarChart3 className="w-4 h-4" /></IconButton>
            {!d.archived_at && (
                <>
                    <IconButton label={`Edit ${d.code}`} onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></IconButton>
                    <IconButton label={d.is_active ? `Deactivate ${d.code}` : `Activate ${d.code}`} onClick={() => toggle(d)} disabled={busyId === d._id} tone={d.is_active ? 'default' : 'success'}>
                        <Power className="w-4 h-4" />
                    </IconButton>
                    <IconButton label={`Delete ${d.code}`} onClick={() => setDeleting(d)} tone="danger"><Trash2 className="w-4 h-4" /></IconButton>
                </>
            )}
        </div>
    );

    const usageCell = (d: AdminDiscount) => {
        const pct = d.max_usage ? Math.min(100, Math.round((d.usage_count / d.max_usage) * 100)) : null;
        return (
            <div className="min-w-[90px]">
                <p className="text-sm tabular-nums text-gray-900 dark:text-white">
                    {d.usage_count}<span className="text-gray-400"> / {d.max_usage ?? '∞'}</span>
                </p>
                {pct != null && (
                    <div className="mt-1 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden" aria-hidden="true">
                        <div className={`h-full rounded-full ${pct >= 100 ? 'bg-orange-500' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
                    </div>
                )}
            </div>
        );
    };

    const selectClass = 'px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500';

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button onClick={() => router.push('/admin')} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discounts</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                        Coupon codes for a single course, a bundle or the Master Plan. Uses are counted only after a verified payment.
                    </p>
                </div>
                <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950">
                    <Plus className="w-4 h-4" /> Create discount
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by coupon code or name"
                        aria-label="Search discounts"
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select aria-label="Filter by product" value={product} onChange={(e) => { setProduct(e.target.value); setPage(1); }} className={selectClass}>
                        <option value="">All products</option>
                        <option value="ALL_IN_ONE">Master Plan</option>
                        <option value="COURSE">All course coupons</option>
                        {bundles.length > 0 && (
                            <optgroup label="Bundles">
                                {bundles.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </optgroup>
                        )}
                        {courses.length > 0 && (
                            <optgroup label="Courses">
                                {courses.map((c) => <option key={c.id} value={`course:${c.id}`}>{c.name}</option>)}
                            </optgroup>
                        )}
                    </select>
                    <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectClass}>
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="expired">Expired</option>
                        <option value="archived">Archived</option>
                    </select>
                    <select aria-label="Sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className={selectClass}>
                        {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>
            </div>

            {error && (
                <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300">
                    {error}
                    <button onClick={load} className="font-semibold underline">Retry</button>
                </div>
            )}

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <th className="px-4 py-3">Coupon</th>
                                <th className="px-4 py-3">Discount</th>
                                <th className="px-4 py-3">Applies to</th>
                                <th className="px-4 py-3">Usage</th>
                                <th className="px-4 py-3">Created</th>
                                <th className="px-4 py-3">Expires</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading && rows.length === 0 ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}><td colSpan={8} className="px-4 py-4"><div className="h-6 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" /></td></tr>
                                ))
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={8}><EmptyState filtered={filtersActive} archived={archivedView} onCreate={openCreate} /></td></tr>
                            ) : rows.map((d) => (
                                <tr key={d._id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${loading ? 'opacity-60' : ''}`}>
                                    <td className="px-4 py-3 max-w-[240px]">
                                        <button onClick={() => copyCode(d.code)} title="Copy code" className="group inline-flex items-center gap-1.5 font-mono text-sm font-bold tracking-wide text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                                            {d.code}
                                            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                                        </button>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{d.name}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-sm font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">
                                            {valueLabel(d)} off
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[200px]">{productCell(d)}</td>
                                    <td className="px-4 py-3">{usageCell(d)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(d.created_at)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{d.expires_at ? fmtDate(d.expires_at) : 'Never'}</td>
                                    <td className="px-4 py-3"><StateBadge state={d.state} /></td>
                                    <td className="px-4 py-3">{actions(d)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {loading && rows.length === 0 ? (
                        [...Array(3)].map((_, i) => <div key={i} className="p-4"><div className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" /></div>)
                    ) : rows.length === 0 ? (
                        <EmptyState filtered={filtersActive} archived={archivedView} onCreate={openCreate} />
                    ) : rows.map((d) => (
                        <div key={d._id} className="p-4 space-y-2.5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <button onClick={() => copyCode(d.code)} className="font-mono text-sm font-bold tracking-wide text-gray-900 dark:text-white">{d.code}</button>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{d.name}</p>
                                </div>
                                <StateBadge state={d.state} />
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-bold text-indigo-700 dark:text-indigo-300">{valueLabel(d)} off</span>
                                {productCell(d)}
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                    {usageCell(d)}
                                    <span>Expires {d.expires_at ? fmtDate(d.expires_at) : 'never'}</span>
                                </div>
                                {actions(d)}
                            </div>
                        </div>
                    ))}
                </div>

                {meta && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Page {meta.page} of {meta.totalPages} · {meta.total} discounts</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"><ChevronLeft className="w-4 h-4" /> Previous</button>
                            <button onClick={() => setPage((p) => p + 1)} disabled={page >= meta.totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">Next <ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}
            </div>

            <DiscountForm
                open={formOpen}
                discount={editing}
                initialProduct={editing ? null : initialProduct}
                onClose={closeForm}
                onSaved={() => { closeForm(); load(); }}
            />
            <DiscountUsage discount={usageFor} onClose={() => setUsageFor(null)} />
            <ConfirmDialog
                open={!!deleting}
                title={`Delete ${deleting?.code ?? ''}?`}
                message={deleting && (deleting.usage_count > 0 || deleting.reserved_count > 0)
                    ? <>This coupon has checkout history, so it will be <strong>archived</strong> instead: it stops working immediately, and past payments keep their records.</>
                    : <>Students will no longer be able to use this code. This can’t be undone.</>}
                confirmLabel={deleting && (deleting.usage_count > 0 || deleting.reserved_count > 0) ? 'Archive coupon' : 'Delete coupon'}
                busy={!!deleting && busyId === deleting._id}
                onConfirm={confirmDelete}
                onCancel={() => setDeleting(null)}
            />
        </div>
    );
}

function StateBadge({ state }: { state: DiscountState }) {
    const s = STATE_BADGE[state];
    return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.cls}`}>{s.label}</span>;
}

function IconButton({ label, onClick, children, disabled, tone = 'default' }: {
    label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean; tone?: 'default' | 'danger' | 'success';
}) {
    const toneCls = tone === 'danger'
        ? 'hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
        : tone === 'success'
            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            : 'hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20';
    return (
        <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label}
            className={`p-2 rounded-lg text-gray-400 transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${toneCls}`}>
            {children}
        </button>
    );
}

function EmptyState({ filtered, archived, onCreate }: { filtered: boolean; archived: boolean; onCreate: () => void }) {
    return (
        <div className="px-4 py-16 text-center">
            <div className="mx-auto mb-3 flex w-12 h-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30">
                <TicketPercent className="w-6 h-6 text-indigo-500" aria-hidden="true" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">
                {archived ? 'No archived coupons' : filtered ? 'No discounts match these filters' : 'No discounts yet'}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {filtered ? 'Try a different search or filter.' : 'Create a coupon for a course, a bundle or the Master Plan.'}
            </p>
            {!filtered && (
                <button onClick={onCreate} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
                    <Plus className="w-4 h-4" /> Create discount
                </button>
            )}
        </div>
    );
}
