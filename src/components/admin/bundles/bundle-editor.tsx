"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
    AlertTriangle, ArrowLeft, BookOpen, Check, Eye, EyeOff, FileText, ImageIcon, IndianRupee,
    Info, Layers, Link as LinkIcon, ListOrdered, Loader2, Plus, RefreshCw, Search, Users,
} from 'lucide-react';
import { courseGroupService } from '@/services/api/courseGroupService';
import { courseService } from '@/services/api/course.api';
import { apiErrorMessage, apiFieldErrors } from '@/services/api/discount.api';
import { isValidDocumentUrl, normalizeDocumentUrlInput } from '@/lib/document-url';
import { SortableCourseList, type SortableCourse } from './sortable-course-list';
import type { BundleSaveInput, Course } from '@/types/course';

interface Details {
    name: string;
    description: string;
    price: string;
    image_url: string;
    document_url: string;
    status: 'active' | 'inactive';
}

const EMPTY: Details = { name: '', description: '', price: '', image_url: '', document_url: '', status: 'inactive' };

/**
 * Create or edit a bundle on one page. Details, membership and course order
 * are saved together in ONE request, so students never see a half-applied
 * edit. Removing a course never takes it away from students who already own
 * the bundle (the server secures their access first).
 */
export function BundleEditor({ bundleId }: { bundleId?: string }) {
    const router = useRouter();
    const isNew = !bundleId;

    const [loading, setLoading] = useState(!isNew);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [details, setDetails] = useState<Details>(EMPTY);
    const [courses, setCourses] = useState<SortableCourse[]>([]);
    const [purchaseCount, setPurchaseCount] = useState(0);
    const savedRef = useRef<{ details: Details; ids: string[] }>({ details: EMPTY, ids: [] });
    const [updatedAt, setUpdatedAt] = useState<string | undefined>();

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [conflict, setConflict] = useState(false);

    // Course picker
    const [catalog, setCatalog] = useState<Course[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        if (!bundleId) return;
        setLoading(true);
        setLoadError(null);
        setConflict(false);
        try {
            const [group, members, all] = await Promise.all([
                courseGroupService.getGroupById(bundleId),
                courseGroupService.getOrderedCourses(bundleId),
                courseGroupService.getAllGroups().catch(() => []),
            ]);
            const d: Details = {
                name: group.name || '',
                description: group.description || '',
                price: group.price != null ? String(group.price) : '',
                image_url: group.image_url || '',
                document_url: group.document_url || '',
                status: group.status === 'inactive' ? 'inactive' : 'active',
            };
            const list = members.map((m) => ({ _id: String(m._id), title: m.title, status: m.status }));
            setDetails(d);
            setCourses(list);
            setUpdatedAt(group.updated_at);
            setPurchaseCount(all.find((g) => g._id === bundleId)?.purchase_count ?? 0);
            savedRef.current = { details: d, ids: list.map((c) => c._id) };
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load this bundle.'));
        } finally {
            setLoading(false);
        }
    }, [bundleId]);

    useEffect(() => { load(); }, [load]);

    // Catalog: first page on open, then server-side search (debounced).
    useEffect(() => {
        let cancelled = false;
        setCatalogLoading(true);
        const t = window.setTimeout(() => {
            courseService.getAll({ limit: 100, ...(search.trim() ? { q: search.trim() } : {}) })
                .then((r) => { if (!cancelled) setCatalog(r.data); })
                .catch(() => { if (!cancelled) setCatalog([]); })
                .finally(() => { if (!cancelled) setCatalogLoading(false); });
        }, search ? 300 : 0);
        return () => { cancelled = true; window.clearTimeout(t); };
    }, [search]);

    const inBundle = useMemo(() => new Set(courses.map((c) => c._id)), [courses]);
    const available = catalog.filter((c) => !inBundle.has(String(c._id)));

    const dirty = useMemo(() => {
        const s = savedRef.current;
        return JSON.stringify(details) !== JSON.stringify(s.details) || courses.map((c) => c._id).join() !== s.ids.join();
    }, [details, courses]);

    // Warn before leaving with unsaved changes.
    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirty]);

    const set = <K extends keyof Details>(k: K, v: Details[K]) => {
        setDetails((d) => ({ ...d, [k]: v }));
        if (errors[k]) setErrors((e) => ({ ...e, [k]: '' }));
    };

    const removedCount = savedRef.current.ids.filter((id) => !inBundle.has(id)).length;

    const validate = () => {
        const e: Record<string, string> = {};
        if (!details.name.trim()) e.name = 'Bundle name is required.';
        const price = Number(details.price);
        if (details.price === '' || !Number.isFinite(price) || price < 0) e.price = 'Enter a price of 0 or more.';
        else if (Math.round(price * 100) !== price * 100) e.price = 'At most 2 decimal places.';
        if (details.image_url.trim() && !/^https?:\/\/\S+$/i.test(details.image_url.trim())) e.image_url = 'Must be an http(s) link.';
        const doc = normalizeDocumentUrlInput(details.document_url);
        if (doc !== null && !isValidDocumentUrl(doc)) e.document_url = 'Must be a valid http(s) link.';
        if (details.status === 'active' && courses.length === 0) e.courses = 'Add at least one course before publishing.';
        return e;
    };

    const save = async () => {
        const e = validate();
        setErrors(e);
        if (Object.values(e).some(Boolean)) {
            toast.error('Please fix the highlighted fields.');
            return;
        }
        const payload: BundleSaveInput = {
            name: details.name.trim(),
            description: details.description.trim(),
            price: Number(details.price),
            image_url: details.image_url.trim(),
            status: details.status,
            document_url: normalizeDocumentUrlInput(details.document_url),
            courseIds: courses.map((c) => c._id),
        };
        setSaving(true);
        try {
            if (isNew) {
                const created = await courseGroupService.createBundle(payload);
                savedRef.current = { details, ids: payload.courseIds! };
                toast.success('Bundle created');
                router.replace(`/admin/bundles/${created._id}`);
                return;
            }
            const saved = await courseGroupService.saveBundle(bundleId!, { ...payload, expected_updated_at: updatedAt });
            setUpdatedAt(saved.updated_at);
            savedRef.current = { details, ids: payload.courseIds! };
            setCourses((cs) => [...cs]); // recompute dirty
            toast.success(removedCount > 0 && purchaseCount > 0
                ? 'Saved. Students who already own this bundle keep access to removed courses.'
                : 'Bundle saved');
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 409) {
                setConflict(true);
                return;
            }
            const fields = apiFieldErrors(err);
            if (fields.courseIds) fields.courses = fields.courseIds;
            setErrors(fields);
            toast.error(apiErrorMessage(err, 'Could not save the bundle.'));
        } finally {
            setSaving(false);
        }
    };

    const syncAccess = async () => {
        if (!bundleId) return;
        setSyncing(true);
        try {
            const r = await courseGroupService.syncAccess(bundleId);
            if (r.failed > 0) toast.error(`Synced ${r.holders} student(s), but ${r.failed} enrollment(s) failed. Try again in a moment.`);
            else toast.success(r.enrolled > 0 ? `Added ${r.enrolled} missing enrollment(s) for ${r.holders} student(s).` : `All ${r.holders} owner(s) already have every course.`);
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not sync access.'));
        } finally {
            setSyncing(false);
        }
    };

    const addCourse = (c: Course) => {
        setCourses((cs) => [...cs, { _id: String(c._id), title: c.title, status: c.status }]);
        if (errors.courses) setErrors((e) => ({ ...e, courses: '' }));
    };

    const leave = () => {
        if (dirty && !window.confirm('Discard your unsaved changes?')) return;
        router.push('/admin/bundles');
    };

    const inputClass = (field: string, extra = '') =>
        `w-full rounded-xl border bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none transition focus:ring-2 ${extra} ${errors[field] ? 'border-red-300 dark:border-red-700 focus:ring-red-500/30' : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/30 focus:border-blue-500'}`;
    const Err = ({ f }: { f: string }) => errors[f] ? <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400" role="alert">{errors[f]}</p> : null;
    const label = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5';

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4" aria-busy="true">
                <div className="h-8 w-64 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                    <div className="h-96 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    <div className="h-96 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                </div>
            </div>
        );
    }
    if (loadError) {
        return (
            <div className="max-w-xl mx-auto px-4 py-16 text-center">
                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="font-semibold text-gray-900 dark:text-white">{loadError}</p>
                <div className="mt-4 flex justify-center gap-2">
                    <button onClick={load} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">Retry</button>
                    <Link href="/admin/bundles" className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200">All bundles</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28">
            <button onClick={leave} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" /> All bundles
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{isNew ? 'New bundle' : details.name || 'Edit bundle'}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {isNew ? 'Group courses into a bundle students can buy.' : 'Edit details, choose courses and set the order students see them in.'}
                    </p>
                </div>
                {!isNew && (
                    <span className={`self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${details.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {details.status === 'active' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {details.status === 'active' ? 'Published' : 'Hidden'}
                    </span>
                )}
            </div>

            {conflict && (
                <div role="alert" className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                    <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> Someone else changed this bundle since you opened it. Reload to see their changes (your unsaved edits will be lost).</span>
                    <button onClick={load} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 px-3 py-1.5 font-semibold"><RefreshCw className="w-4 h-4" /> Reload</button>
                </div>
            )}

            {!isNew && purchaseCount > 0 && (
                <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-900 dark:text-blue-200">
                    <p className="flex items-start gap-2">
                        <Users className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                        <span><strong>{purchaseCount}</strong> purchase{purchaseCount === 1 ? '' : 's'}. Courses you add reach these students automatically; removing a course never takes it away from them. Price changes apply to new purchases only.</span>
                    </p>
                    <button type="button" onClick={syncAccess} disabled={syncing} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 px-3 py-1.5 font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-60">
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Sync student access
                    </button>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-start">
                {/* ── Details ── */}
                <section aria-labelledby="bundle-details" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 space-y-5">
                    <h2 id="bundle-details" className="flex items-center gap-2 font-bold text-gray-900 dark:text-white"><Layers className="w-4 h-4 text-blue-600" /> Details</h2>
                    <div>
                        <label htmlFor="b-name" className={label}>Bundle name</label>
                        <input id="b-name" value={details.name} onChange={(e) => set('name', e.target.value)} maxLength={150} placeholder="e.g. Java Full Stack" className={inputClass('name')} aria-invalid={!!errors.name} />
                        <Err f="name" />
                    </div>
                    <div>
                        <label htmlFor="b-desc" className={label}>Description</label>
                        <textarea id="b-desc" value={details.description} onChange={(e) => set('description', e.target.value)} rows={4} maxLength={5000} placeholder="What will students learn?" className={`${inputClass('description')} resize-y`} />
                    </div>
                    <div>
                        <label htmlFor="b-price" className={label}>Price</label>
                        <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input id="b-price" inputMode="decimal" value={details.price} onChange={(e) => set('price', e.target.value.replace(/[^\d.]/g, ''))} placeholder="4999" className={inputClass('price', 'pl-9 tabular-nums')} aria-invalid={!!errors.price} />
                        </div>
                        <Err f="price" />
                    </div>
                    <div>
                        <label htmlFor="b-image" className={label}>Cover image URL <span className="font-normal text-gray-400">(optional)</span></label>
                        <div className="relative">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input id="b-image" type="url" value={details.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://…" className={inputClass('image_url', 'pl-9')} aria-invalid={!!errors.image_url} />
                        </div>
                        <Err f="image_url" />
                        {details.image_url && !errors.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={details.image_url} alt="" className="mt-2 h-28 w-full rounded-xl object-cover border border-gray-100 dark:border-gray-800" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                    </div>
                    <div>
                        <label htmlFor="b-doc" className={label}>Reference document URL <span className="font-normal text-gray-400">(optional)</span></label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input id="b-doc" type="url" value={details.document_url} onChange={(e) => set('document_url', e.target.value)} placeholder="https://example.com/syllabus.pdf" className={inputClass('document_url', 'pl-9')} aria-invalid={!!errors.document_url} />
                        </div>
                        {errors.document_url ? <Err f="document_url" /> : <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex gap-1"><FileText className="w-3.5 h-3.5 shrink-0 mt-px" /> Shown to enrolled students as a link; never processed into notes.</p>}
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Published</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{details.status === 'active' ? 'Visible in the store and purchasable.' : 'Hidden from the store. Existing owners keep access.'}</p>
                        </div>
                        <button type="button" role="switch" aria-checked={details.status === 'active'} aria-label="Published" onClick={() => set('status', details.status === 'active' ? 'inactive' : 'active')}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${details.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${details.status === 'active' ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </section>

                {/* ── Courses ── */}
                <section aria-labelledby="bundle-courses" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 space-y-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 id="bundle-courses" className="flex items-center gap-2 font-bold text-gray-900 dark:text-white"><ListOrdered className="w-4 h-4 text-blue-600" /> Courses &amp; order</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Drag the handle, use the arrows, or focus the handle and press ↑/↓. Course 1 is where students start.</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 tabular-nums">{courses.length}</span>
                    </div>

                    {courses.length === 0 ? (
                        <div className={`rounded-xl border-2 border-dashed px-4 py-8 text-center ${errors.courses ? 'border-red-300 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'}`}>
                            <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No courses yet. Add some from the list below.</p>
                        </div>
                    ) : (
                        <SortableCourseList items={courses} onChange={setCourses} onRemove={(id) => setCourses((cs) => cs.filter((c) => c._id !== id))} disabled={saving} />
                    )}
                    <Err f="courses" />
                    {!isNew && removedCount > 0 && purchaseCount > 0 && (
                        <p className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                            <Info className="w-4 h-4 shrink-0" /> {removedCount} course{removedCount === 1 ? '' : 's'} will leave the bundle. Current owners keep access; new buyers won’t get {removedCount === 1 ? 'it' : 'them'}.
                        </p>
                    )}

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Add courses</h3>
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search all courses" aria-label="Search courses to add" className={inputClass('search', 'pl-9')} />
                        </div>
                        <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                            {catalogLoading && available.length === 0 ? (
                                <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading courses…</div>
                            ) : available.length === 0 ? (
                                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{search ? 'No matching courses.' : 'Every course is already in this bundle.'}</p>
                            ) : available.map((c) => (
                                <div key={String(c._id)} className="flex items-center gap-3 px-3 py-2.5">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{c.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                            {[c.difficulty, c.status !== 'active' ? 'draft' : null].filter(Boolean).join(' · ') || 'Course'}
                                        </p>
                                    </div>
                                    <button type="button" onClick={() => addCourse(c)} disabled={saving} className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50">
                                        <Plus className="w-3.5 h-3.5" /> Add
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            {/* Save bar */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 pb-[env(safe-area-inset-bottom)]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate" aria-live="polite">
                        {saving ? 'Saving…' : dirty ? <span className="text-amber-700 dark:text-amber-400 font-medium">Unsaved changes</span> : isNew ? 'Not saved yet' : 'All changes saved'}
                    </p>
                    <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={leave} disabled={saving} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-60">
                            {dirty ? 'Discard' : 'Close'}
                        </button>
                        <button type="button" onClick={save} disabled={saving || (!dirty && !isNew)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {isNew ? 'Create bundle' : 'Save changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
