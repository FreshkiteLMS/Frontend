"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { mentorAdminService } from '@/services/api/mentor.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import { Modal } from '@/components/ui/modal';
import { Breadcrumbs, DataNote, ErrorState, Panel, SkeletonBlock, btnPrimary, btnSecondary, inputCls, useAsync } from '@/components/admin/insights/ui';
import type { MentorAccess, MentorCandidate } from '@/types/mentor';
import { PermissionEditor, useCatalog } from './permission-editor';

/**
 * Add a mentor: a new account (a temporary password is generated and shown
 * once; they can change it in Settings, or sign in with Google using the same
 * email) or an existing student / teacher account.
 */
export function MentorCreate() {
    const router = useRouter();
    const catalog = useCatalog();
    const [mode, setMode] = useState<'new' | 'existing'>('new');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [q, setQ] = useState('');
    const [dq, setDq] = useState('');
    const [picked, setPicked] = useState<MentorCandidate | null>(null);
    const [access, setAccess] = useState<MentorAccess | null>(null);
    const [busy, setBusy] = useState(false);
    const [created, setCreated] = useState<{ id: string; name: string; email: string; password: string | null } | null>(null);
    const [copied, setCopied] = useState(false);
    useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t); }, [q]);
    useEffect(() => {
        if (catalog.data && !access) setAccess({ fullAdmin: false, batchScope: 'assigned', studentScope: 'assigned', permissions: catalog.data.defaults, batchIds: [] });
    }, [catalog.data, access]);
    const candidates = useAsync(() => mentorAdminService.candidates(dq), `cand:${dq}`, mode === 'existing' && dq.length >= 2);

    const valid = mode === 'new' ? name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) : !!picked;
    const submit = async () => {
        if (!access) return;
        setBusy(true);
        try {
            const body = mode === 'new' ? { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, ...access } : { userId: picked!.userId, ...access };
            const r = await mentorAdminService.create(body);
            toast.success('Mentor added');
            setCreated({ id: r.mentor.id, name: r.mentor.name, email: r.mentor.email, password: r.temporaryPassword });
        } catch (err) { toast.error(apiErrorMessage(err, 'The mentor was not added')); } finally { setBusy(false); }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Breadcrumbs items={[{ label: 'Mentors', href: '/admin/mentors' }, { label: 'Add mentor' }]} />
            <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Add a mentor</h1>
            <div className="space-y-5">
                <Panel title="Account">
                    <div role="tablist" aria-label="Account type" className="mb-4 inline-flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                        {(['new', 'existing'] as const).map(m => (
                            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                                className={`rounded-lg px-4 py-1.5 text-sm font-medium ${mode === m ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}>
                                {m === 'new' ? 'New account' : 'Existing user'}
                            </button>
                        ))}
                    </div>
                    {mode === 'new' ? (
                        <div className="grid gap-4 sm:grid-cols-3">
                            <label className="text-sm text-gray-700 dark:text-gray-300">Full name<input className={`${inputCls} mt-1 w-full`} value={name} maxLength={120} onChange={e => setName(e.target.value)} /></label>
                            <label className="text-sm text-gray-700 dark:text-gray-300">Email<input type="email" className={`${inputCls} mt-1 w-full`} value={email} maxLength={200} onChange={e => setEmail(e.target.value)} /></label>
                            <label className="text-sm text-gray-700 dark:text-gray-300">Phone (optional)<input className={`${inputCls} mt-1 w-full`} value={phone} maxLength={20} onChange={e => setPhone(e.target.value)} /></label>
                            <div className="sm:col-span-3"><DataNote>A temporary password is generated and shown once after saving. Share it privately; the mentor can change it in Settings or sign in with Google using this email.</DataNote></div>
                        </div>
                    ) : (
                        <div>
                            {picked ? (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                                    <span><span className="block text-sm font-semibold text-gray-900 dark:text-white">{picked.name}</span><span className="block text-xs text-gray-500">{picked.email} · currently a {picked.role}</span></span>
                                    <button type="button" className={btnSecondary} onClick={() => setPicked(null)}>Change</button>
                                </div>
                            ) : (
                                <>
                                    <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search students and teachers by name, email or Student ID" aria-label="Search users" className={`${inputCls} w-full`} />
                                    {dq.length >= 2 && (candidates.error ? <div className="mt-2"><ErrorState error={candidates.error} onRetry={candidates.reload} /></div> : !candidates.data ? <div className="mt-2"><SkeletonBlock rows={2} /></div> : (
                                        <ul className="mt-2 max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                                            {candidates.data.length === 0 ? <li className="p-3 text-sm text-gray-500">No matching users.</li> : candidates.data.map(c => (
                                                <li key={c.userId}><button type="button" className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800/40" onClick={() => setPicked(c)}>
                                                    <span className="min-w-0 flex-1"><span className="block truncate text-gray-900 dark:text-white">{c.name}</span><span className="block truncate text-xs text-gray-500">{c.email}{c.studentCode ? ` · ${c.studentCode}` : ''}</span></span>
                                                    <span className="text-xs text-gray-500">{c.role}</span>
                                                </button></li>
                                            ))}
                                        </ul>
                                    ))}
                                </>
                            )}
                            <div className="mt-3"><DataNote>The account becomes a mentor account: it signs in to the Mentor Dashboard instead of the student app, and its sessions end so the change applies at once. Removing mentor access later gives the previous role back. Progress and purchases are kept.</DataNote></div>
                        </div>
                    )}
                </Panel>
                {catalog.error ? <ErrorState error={catalog.error} onRetry={catalog.reload} /> : !catalog.data || !access ? <SkeletonBlock rows={6} /> : (
                    <PermissionEditor catalog={catalog.data} value={access} onChange={setAccess} />
                )}
                <div className="flex justify-end gap-2">
                    <button type="button" className={btnSecondary} onClick={() => router.push('/admin/mentors')}>Cancel</button>
                    <button type="button" className={btnPrimary} disabled={!valid || busy || !access} onClick={submit}>{busy ? 'Adding…' : 'Add mentor'}</button>
                </div>
            </div>

            <Modal open={!!created} onClose={() => router.push(`/admin/mentors/${created?.id}`)} title="Mentor added" size="sm"
                footer={<div className="flex justify-end"><button type="button" className={btnPrimary} onClick={() => router.push(`/admin/mentors/${created?.id}`)}>Open mentor</button></div>}>
                {created?.password ? (
                    <>
                        <p className="text-sm text-gray-700 dark:text-gray-300">Share these sign-in details with {created.name} privately. The password is not shown again.</p>
                        <dl className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
                            <div><dt className="text-xs text-gray-500">Email</dt><dd className="font-mono">{created.email}</dd></div>
                            <div><dt className="text-xs text-gray-500">Temporary password</dt><dd className="flex items-center gap-2 font-mono">{created.password}
                                <button type="button" className="rounded p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Copy password"
                                    onClick={async () => { try { await navigator.clipboard.writeText(created.password!); setCopied(true); } catch { /* manual copy */ } }}>
                                    {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                                </button></dd></div>
                        </dl>
                    </>
                ) : <p className="text-sm text-gray-700 dark:text-gray-300">{created?.name} signs in with their existing password (or Google) and now lands on the Mentor Dashboard.</p>}
            </Modal>
        </div>
    );
}
