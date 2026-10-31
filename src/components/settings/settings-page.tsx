"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    Bell, Check, Download, Eye, EyeOff, Laptop, Loader2, LogOut, Monitor, Moon, Palette, Shield, SlidersHorizontal,
    Smartphone, Sun, Trash2, User, UserCircle, Lock, RotateCcw, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/components/layout/theme-provider';
import { accountService, apiErrorMessage } from '@/services/api/account.api';
import { formatDate, formatDateTime, formatTime, usePreferencesStore } from '@/stores/preferences-store';
import type { AccountOverview, DeletionRequestAdminView, Preferences, PrivacySettings, SessionView } from '@/types/profile';
import { ProfileSettings } from './profile-settings';
import { Button, ConfirmDialog, Field, SaveBar, SectionHeader, TextInput, Toggle, hasUnsavedChanges, useUnsavedGuard } from './settings-ui';

type SectionKey = 'account' | 'profile' | 'security' | 'notifications' | 'privacy' | 'appearance' | 'preferences' | 'management';

const SECTIONS: Array<{ key: SectionKey; label: string; icon: LucideIcon }> = [
    { key: 'account', label: 'Account', icon: User },
    { key: 'profile', label: 'Profile', icon: UserCircle },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'privacy', label: 'Privacy', icon: Lock },
    { key: 'appearance', label: 'Appearance', icon: Palette },
    { key: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
    { key: 'management', label: 'Account management', icon: LogOut },
];

export function SettingsPage() {
    const router = useRouter();
    const params = useSearchParams();
    const initialSection = (SECTIONS.find((s) => s.key === params.get('section'))?.key ?? 'account') as SectionKey;
    const [section, setSection] = useState<SectionKey>(initialSection);
    const [data, setData] = useState<AccountOverview | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            setData(await accountService.overview());
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not load your settings'));
        }
    }, []);
    useEffect(() => { void load(); }, [load]);

    const go = (key: SectionKey) => {
        if (key === section) return;
        if (hasUnsavedChanges() && !window.confirm('You have unsaved changes. Leave this section without saving?')) return;
        setSection(key);
        router.replace(`/settings?section=${key}`, { scroll: false });
    };

    const patch = (p: Partial<AccountOverview>) => setData((d) => (d ? { ...d, ...p } : d));

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">Manage your account, privacy and preferences.</p>

            <div className="grid md:grid-cols-[220px_1fr] gap-6 items-start">
                {/* Navigation: list on desktop, select on mobile */}
                <nav aria-label="Settings sections" className="hidden md:block sticky top-20">
                    <ul className="space-y-0.5">
                        {SECTIONS.map(({ key, label, icon: Icon }) => (
                            <li key={key}>
                                <button
                                    onClick={() => go(key)}
                                    aria-current={section === key ? 'page' : undefined}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                                        section === key ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" /> {label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
                <select value={section} onChange={(e) => go(e.target.value as SectionKey)} className="md:hidden w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white" aria-label="Settings section">
                    {SECTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>

                <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-8 min-w-0">
                    {error ? (
                        <div className="text-center py-12 space-y-3">
                            <p className="text-sm text-gray-500">{error}</p>
                            <Button variant="secondary" onClick={() => void load()}><RotateCcw className="w-4 h-4" /> Try again</Button>
                        </div>
                    ) : !data ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-6 w-40 rounded bg-gray-100 dark:bg-gray-800" />
                            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-11 rounded-xl bg-gray-100 dark:bg-gray-800" />)}
                        </div>
                    ) : (
                        <>
                            {section === 'account' && <AccountSection data={data} onSaved={(a) => patch({ account: { ...data.account, ...a } })} />}
                            {section === 'profile' && (
                                <ProfileSettings
                                    initial={data.profile}
                                    profileHref={`/profile/${data.account.username || data.account.id}`}
                                    onSaved={(p) => patch({ profile: p })}
                                />
                            )}
                            {section === 'security' && <SecuritySection data={data} onChanged={load} />}
                            {section === 'notifications' && <NotificationsSection data={data} onSaved={(n) => patch({ notifications: n })} />}
                            {section === 'privacy' && <PrivacySection data={data} onSaved={(p) => patch({ privacy: p })} />}
                            {section === 'appearance' && <AppearanceSection data={data} onSaved={(p) => patch({ preferences: p })} />}
                            {section === 'preferences' && <PreferencesSection data={data} onSaved={(p) => patch({ preferences: p })} />}
                            {section === 'management' && <ManagementSection data={data} onChanged={load} />}
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}

/* ───────────────────────── Account ───────────────────────── */

function AccountSection({ data, onSaved }: { data: AccountOverview; onSaved: (a: Partial<AccountOverview['account']>) => void }) {
    const initial = { name: data.account.name || '', username: data.account.username || '' };
    const [form, setForm] = useState(initial);
    const [saving, setSaving] = useState(false);
    const [usernameCheck, setUsernameCheck] = useState<{ checking: boolean; ok: boolean | null; reason: string | null }>({ checking: false, ok: null, reason: null });
    const dirty = form.name !== initial.name || form.username !== initial.username;
    useUnsavedGuard(dirty);

    // Live availability check (debounced) while the username is being edited.
    useEffect(() => {
        const u = form.username.trim();
        if (!u || u.toLowerCase() === (data.account.username || '').toLowerCase()) {
            setUsernameCheck({ checking: false, ok: null, reason: null });
            return;
        }
        setUsernameCheck({ checking: true, ok: null, reason: null });
        const id = window.setTimeout(async () => {
            try {
                const r = await accountService.usernameAvailable(u);
                setUsernameCheck({ checking: false, ok: r.available, reason: r.reason });
            } catch {
                setUsernameCheck({ checking: false, ok: null, reason: null });
            }
        }, 400);
        return () => window.clearTimeout(id);
    }, [form.username, data.account.username]);

    const nameError = form.name.trim().length > 0 && form.name.trim().length < 2 ? 'Use at least 2 characters' : null;

    const save = async () => {
        if (!form.name.trim()) return void toast.error('Display name is required');
        setSaving(true);
        try {
            const dto: { name?: string; username?: string } = {};
            if (form.name !== initial.name) dto.name = form.name;
            if (form.username !== initial.username) dto.username = form.username;
            const saved = await accountService.updateAccount(dto);
            onSaved({ name: saved.name, username: saved.username });
            setForm({ name: saved.name, username: saved.username || '' });
            // Keep the cached session user in step (navbar name).
            try {
                const u = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ ...u, name: saved.name, username: saved.username }));
            } catch { /* ignore */ }
            toast.success('Account updated');
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not update account'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <SectionHeader title="Account" description="Your name and handle across the LMS. Your account ID never changes, so links and history stay intact." />
            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Display name" error={nameError}>
                    <TextInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} maxLength={60} invalid={!!nameError} />
                </Field>
                <Field
                    label="Username"
                    hint={usernameCheck.checking ? 'Checking…' : usernameCheck.ok ? 'Available' : undefined}
                    error={usernameCheck.ok === false ? usernameCheck.reason : null}
                >
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
                        <input
                            value={form.username}
                            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                            maxLength={30}
                            aria-invalid={usernameCheck.ok === false || undefined}
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-7 pr-9 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {usernameCheck.ok && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                    </div>
                    <span className="block text-xs text-gray-400 mt-1">{data.account.username_rules}. Your profile link becomes /u/{form.username || 'username'}; old links using your account ID keep working.</span>
                </Field>
                <Field label="Email address">
                    <TextInput value={data.account.email} onChange={() => undefined} disabled />
                    <span className="block text-xs text-gray-400 mt-1">Email changes need verification, which isn’t available yet — contact an administrator to change it.</span>
                </Field>
                <Field label="Account">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300">
                        {data.account.role === 'admin' ? 'Administrator' : data.account.role === 'teacher' ? 'Mentor' : 'Student'}{data.account.created_at && ` · member since ${formatDate(data.account.created_at)}`}
                    </div>
                </Field>
            </div>
            <SaveBar dirty={dirty} saving={saving} onSave={save} onReset={() => setForm(initial)} />
            {usernameCheck.ok === false && dirty && <span className="sr-only">Username unavailable</span>}
        </div>
    );
}

/* ───────────────────────── Security ───────────────────────── */

function passwordStrength(pw: string): { score: number; label: string; tone: string } {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
    const tones = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-600'];
    return { score, label: labels[score], tone: tones[score] };
}

function PasswordInput({ value, onChange, autoComplete, invalid }: { value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoComplete={autoComplete}
                aria-invalid={invalid || undefined}
                className={`w-full rounded-xl border bg-white dark:bg-gray-900 pl-3 pr-10 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${invalid ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
            />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-gray-400 hover:text-gray-600" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    );
}

function SecuritySection({ data, onChanged }: { data: AccountOverview; onChanged: () => Promise<void> }) {
    const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
    const [saving, setSaving] = useState(false);
    const [sessions, setSessions] = useState<SessionView[]>(data.security.sessions);
    const [busy, setBusy] = useState<string | null>(null);
    const strength = passwordStrength(pw.next);
    const rulesOk = pw.next.length >= 8 && /[a-zA-Z]/.test(pw.next) && /\d/.test(pw.next);
    const mismatch = pw.confirm.length > 0 && pw.confirm !== pw.next;
    useUnsavedGuard(!!(pw.current || pw.next || pw.confirm));

    const change = async () => {
        if (!rulesOk) return void toast.error('Use at least 8 characters with letters and numbers');
        if (mismatch) return void toast.error('Passwords don’t match');
        setSaving(true);
        try {
            const r = await accountService.changePassword(pw.current, pw.next);
            setPw({ current: '', next: '', confirm: '' });
            toast.success(r.other_sessions_signed_out ? `Password changed. Signed out ${r.other_sessions_signed_out} other device(s).` : 'Password changed');
            setSessions(await accountService.sessions());
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not change password'));
        } finally {
            setSaving(false);
        }
    };

    const revoke = async (s: SessionView) => {
        setBusy(s.id);
        try {
            await accountService.revokeSession(s.id);
            setSessions((list) => list.filter((x) => x.id !== s.id));
            toast.success('Device signed out');
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not sign out that device'));
        } finally {
            setBusy(null);
        }
    };

    const revokeOthers = async () => {
        setBusy('others');
        try {
            const r = await accountService.revokeOtherSessions();
            setSessions((list) => list.filter((x) => x.current));
            toast.success(r.revoked ? `Signed out ${r.revoked} other device(s)` : 'No other devices were signed in');
            await onChanged();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not sign out other devices'));
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="space-y-8">
            <SectionHeader title="Security" description="Keep your account safe." />

            <div className="space-y-4 max-w-md">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Change password</h3>
                {!data.account.has_password ? (
                    <p className="text-sm text-gray-500">Your account signs in with Google and has no password.</p>
                ) : (
                    <>
                        <Field label="Current password"><PasswordInput value={pw.current} onChange={(v) => setPw((p) => ({ ...p, current: v }))} autoComplete="current-password" /></Field>
                        <Field label="New password">
                            <PasswordInput value={pw.next} onChange={(v) => setPw((p) => ({ ...p, next: v }))} autoComplete="new-password" />
                            {pw.next && (
                                <div className="mt-2">
                                    <div className="flex gap-1">{[0, 1, 2, 3, 4].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i < strength.score ? strength.tone : 'bg-gray-200 dark:bg-gray-700'}`} />)}</div>
                                    <p className="text-xs text-gray-500 mt-1">{strength.label}</p>
                                </div>
                            )}
                            <ul className="mt-2 text-xs space-y-0.5">
                                {[['At least 8 characters', pw.next.length >= 8], ['Letters and numbers', /[a-zA-Z]/.test(pw.next) && /\d/.test(pw.next)], ['Not your email or username', true]].map(([t, ok]) => (
                                    <li key={t as string} className={ok && pw.next ? 'text-emerald-600' : 'text-gray-400'}>{ok && pw.next ? '✓' : '•'} {t}</li>
                                ))}
                            </ul>
                        </Field>
                        <Field label="Confirm new password" error={mismatch ? 'Passwords don’t match' : null}>
                            <PasswordInput value={pw.confirm} onChange={(v) => setPw((p) => ({ ...p, confirm: v }))} autoComplete="new-password" invalid={mismatch} />
                        </Field>
                        <Button onClick={() => void change()} busy={saving} disabled={!pw.current || !rulesOk || mismatch || !pw.confirm}>Update password</Button>
                        <p className="text-xs text-gray-400">Changing your password signs you out on every other device.</p>
                    </>
                )}
            </div>

            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Where you’re signed in</h3>
                    {sessions.some((s) => !s.current) && <Button variant="secondary" onClick={() => void revokeOthers()} busy={busy === 'others'}>Sign out other devices</Button>}
                </div>
                {data.security.last_login && <p className="text-xs text-gray-500">Previous sign-in: {formatDateTime(data.security.last_login.at)} · {data.security.last_login.device}</p>}
                <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800">
                    {sessions.map((s) => {
                        const mobile = /Android|iOS/.test(s.device);
                        const Icon = mobile ? Smartphone : Laptop;
                        return (
                            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                                <span className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><Icon className="w-4 h-4 text-gray-500" /></span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{s.device}{s.current && <span className="ml-2 text-[11px] font-semibold text-emerald-600">This device</span>}</p>
                                    <p className="text-xs text-gray-500">{[s.ip, s.method === 'google' ? 'Google sign-in' : null, `active ${formatDateTime(s.last_used_at)}`].filter(Boolean).join(' · ')}</p>
                                </div>
                                {!s.current && <Button variant="secondary" onClick={() => void revoke(s)} busy={busy === s.id}>Sign out</Button>}
                            </li>
                        );
                    })}
                    {sessions.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">No active sessions recorded yet. Sessions are tracked from your next sign-in.</li>}
                </ul>
                <p className="text-xs text-gray-400">Signing a device out takes effect within 15 minutes, when its current access expires.</p>
            </div>
        </div>
    );
}

/* ───────────────────────── Notifications ───────────────────────── */

function NotificationsSection({ data, onSaved }: { data: AccountOverview; onSaved: (n: AccountOverview['notifications']) => void }) {
    const [prefs, setPrefs] = useState(data.notifications);
    const [busy, setBusy] = useState<string | null>(null);
    const toggle = async (key: string, value: boolean) => {
        setBusy(key);
        const prev = prefs;
        setPrefs((p) => ({ ...p, categories: p.categories.map((c) => (c.key === key ? { ...c, in_app: value } : c)) }));
        try {
            const saved = await accountService.updateNotifications({ [key]: value });
            setPrefs(saved);
            onSaved(saved);
        } catch (err) {
            setPrefs(prev);
            toast.error(apiErrorMessage(err, 'Could not save'));
        } finally {
            setBusy(null);
        }
    };
    return (
        <div className="space-y-6">
            <SectionHeader title="Notifications" description="Choose which in-app notifications you receive. Changes save instantly." />
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {prefs.categories.map((c) => (
                    <Toggle key={c.key} label={c.label} description={c.description} checked={c.in_app} disabled={busy === c.key} onChange={(v) => void toggle(c.key, v)} />
                ))}
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 text-sm">
                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Shield className="w-4 h-4" /> {prefs.mandatory.label}</p>
                <p className="text-gray-600 dark:text-gray-300 mt-1">{prefs.mandatory.description}</p>
                <p className="text-xs text-gray-500 mt-2">Messages from other students never send notifications — they show up as unread counts in Chat.</p>
                {!prefs.email_available && <p className="text-xs text-gray-500 mt-1">Email notifications aren’t available yet; all notifications appear in the app.</p>}
            </div>
        </div>
    );
}

/* ───────────────────────── Privacy ───────────────────────── */

const VISIBILITY: Array<{ key: PrivacySettings['visibility']; title: string; body: string }> = [
    { key: 'public', title: 'Public', body: 'Anyone with your profile link can see it — even without an account. Your email is never shown publicly.' },
    { key: 'students', title: 'Students only', body: 'Only signed-in members of the LMS can open your profile.' },
    { key: 'private', title: 'Private', body: 'Others see only your name and picture.' },
];

function PrivacySection({ data, onSaved }: { data: AccountOverview; onSaved: (p: PrivacySettings) => void }) {
    const [form, setForm] = useState<PrivacySettings>(data.privacy);
    const [saving, setSaving] = useState(false);
    const dirty = JSON.stringify(form) !== JSON.stringify(data.privacy);
    useUnsavedGuard(dirty);
    const set = <K extends keyof PrivacySettings>(k: K, v: PrivacySettings[K]) => setForm((f) => ({ ...f, [k]: v }));
    const profileKey = data.account.username || data.account.id;
    const save = async () => {
        setSaving(true);
        try {
            const saved = await accountService.updatePrivacy(form);
            onSaved(saved);
            setForm(saved);
            toast.success('Privacy settings saved');
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not save'));
        } finally {
            setSaving(false);
        }
    };
    return (
        <div className="space-y-6">
            <SectionHeader title="Privacy" description="These rules are enforced by the server for every page and API — not just hidden on screen." action={<Link href={`/profile/${profileKey}`} className="text-sm font-semibold text-blue-600 hover:underline">Preview profile</Link>} />
            <fieldset>
                <legend className="text-sm font-bold text-gray-900 dark:text-white mb-3">Who can see your profile</legend>
                <div className="grid sm:grid-cols-3 gap-3">
                    {VISIBILITY.map((v) => (
                        <label key={v.key} className={`cursor-pointer rounded-xl border p-4 transition-colors ${form.visibility === v.key ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-500/10 ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                            <input type="radio" name="visibility" value={v.key} checked={form.visibility === v.key} onChange={() => set('visibility', v.key)} className="sr-only" />
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{v.title}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">{v.body}</span>
                        </label>
                    ))}
                </div>
                {form.visibility === 'public' && !data.account.username && (
                    <p className="text-xs text-amber-600 mt-2">Set a username in Account to get a shareable profile link.</p>
                )}
            </fieldset>
            <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">On your profile, show</h3>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    <Toggle label="Learning progress" description="Courses, problem solving, streaks and activity" checked={form.show_progress} onChange={(v) => set('show_progress', v)} />
                    <Toggle label="Achievements & leaderboard rank" checked={form.show_achievements} onChange={(v) => set('show_achievements', v)} />
                    <Toggle label="Skills" checked={form.show_skills} onChange={(v) => set('show_skills', v)} />
                    <Toggle label="Certificates" checked={form.show_certificates} onChange={(v) => set('show_certificates', v)} />
                    <Toggle label="Email address" description="Only to signed-in members, never on the public link" checked={form.show_email} onChange={(v) => set('show_email', v)} />
                </div>
            </div>
            <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Connections</h3>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    <Toggle label="Appear in Friends → Discover" checked={form.discoverable} onChange={(v) => set('discoverable', v)} />
                    <Toggle label="Show when I’m online" checked={form.show_online} onChange={(v) => set('show_online', v)} />
                    <div className="flex items-center justify-between gap-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Who can message me</p>
                        <select value={form.allow_dms} onChange={(e) => set('allow_dms', e.target.value as PrivacySettings['allow_dms'])} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white">
                            <option value="everyone">Everyone</option>
                            <option value="friends">Friends only</option>
                            <option value="none">Nobody</option>
                        </select>
                    </div>
                </div>
            </div>
            <SaveBar dirty={dirty} saving={saving} onSave={save} onReset={() => setForm(data.privacy)} />
        </div>
    );
}

/* ───────────────────────── Appearance ───────────────────────── */

function AppearanceSection({ data, onSaved }: { data: AccountOverview; onSaved: (p: Preferences) => void }) {
    const { preference, setPreference } = useTheme();
    const [saving, setSaving] = useState<string | null>(null);
    const options: Array<{ key: Preferences['theme']; label: string; icon: LucideIcon }> = [
        { key: 'light', label: 'Light', icon: Sun },
        { key: 'dark', label: 'Dark', icon: Moon },
        { key: 'system', label: 'System default', icon: Monitor },
    ];
    const pick = async (theme: Preferences['theme']) => {
        setPreference(theme); // apply immediately
        setSaving(theme);
        try {
            const saved = await accountService.updatePreferences({ theme });
            onSaved(saved);
            usePreferencesStore.getState().setPrefs(saved);
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Saved on this device only'));
        } finally {
            setSaving(null);
        }
    };
    const current = preference ?? data.preferences.theme;
    return (
        <div className="space-y-6">
            <SectionHeader title="Appearance" description="Your choice follows you to every device you sign in on." />
            <div className="grid sm:grid-cols-3 gap-3">
                {options.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => void pick(key)}
                        aria-pressed={current === key}
                        className={`rounded-2xl border p-4 text-left transition-colors ${current === key ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/60 dark:bg-blue-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                    >
                        <div className={`h-20 rounded-xl mb-3 border ${key === 'light' ? 'bg-white border-gray-200' : key === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gradient-to-r from-white to-gray-900 border-gray-300'}`} />
                        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                            <Icon className="w-4 h-4" /> {label}
                            {saving === key && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ───────────────────────── Preferences ───────────────────────── */

function PreferencesSection({ data, onSaved }: { data: AccountOverview; onSaved: (p: Preferences) => void }) {
    const [form, setForm] = useState<Preferences>(data.preferences);
    const [saving, setSaving] = useState(false);
    const dirty = JSON.stringify(form) !== JSON.stringify(data.preferences);
    useUnsavedGuard(dirty);
    const deviceZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
    const zones = useMemo(() => {
        const all: string[] = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? ['Asia/Kolkata', 'UTC'];
        return Array.from(new Set(['Asia/Kolkata', deviceZone, ...all]));
    }, [deviceZone]);
    const sample = '2026-11-02T13:00:00Z';

    const save = async () => {
        setSaving(true);
        try {
            const saved = await accountService.updatePreferences(form);
            onSaved(saved);
            usePreferencesStore.getState().setPrefs(saved);
            toast.success('Preferences saved');
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not save'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <SectionHeader title="Preferences" description="How dates and times are shown to you. Meeting times themselves never change — only how they’re displayed." />
            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Timezone" hint={`Device: ${deviceZone}`} className="sm:col-span-2">
                    <select value={form.timezone ?? ''} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value || null }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-white">
                        <option value="">Use my device’s timezone ({deviceZone})</option>
                        {zones.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                    <span className="block text-xs text-gray-400 mt-1">Used for meeting times in lists, your profile and activity. Calendar grids follow the device timezone.</span>
                </Field>
                <Field label="Date format">
                    <select value={form.date_format} onChange={(e) => setForm((f) => ({ ...f, date_format: e.target.value as Preferences['date_format'] }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-white">
                        <option value="DMY">31 Oct 2026</option>
                        <option value="MDY">Oct 31, 2026</option>
                        <option value="YMD">2026-10-31</option>
                    </select>
                </Field>
                <Field label="Time format">
                    <select value={form.time_format} onChange={(e) => setForm((f) => ({ ...f, time_format: e.target.value as Preferences['time_format'] }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-white">
                        <option value="12h">12-hour (6:30 pm)</option>
                        <option value="24h">24-hour (18:30)</option>
                    </select>
                </Field>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3">
                Preview: a class at 6:30 pm India time shows as <strong>{formatDate(sample, form)}, {formatTime(sample, form)}</strong>
            </p>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <Toggle label="Reduce motion" description="Turn off animations and transitions" checked={form.reduce_motion} onChange={(v) => setForm((f) => ({ ...f, reduce_motion: v }))} />
            </div>
            <SaveBar dirty={dirty} saving={saving} onSave={save} onReset={() => setForm(data.preferences)} />
        </div>
    );
}

/* ───────────────────────── Account management ───────────────────────── */

function ManagementSection({ data, onChanged }: { data: AccountOverview; onChanged: () => Promise<void> }) {
    const { logout } = useAuth();
    const [confirm, setConfirm] = useState<'everywhere' | 'delete' | null>(null);
    const [reason, setReason] = useState('');
    const [exporting, setExporting] = useState(false);
    const isAdmin = data.account.role === 'admin';

    const exportData = async () => {
        setExporting(true);
        try {
            const blob = await accountService.exportData();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `freshkite-my-data-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Export failed'));
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-8">
            <SectionHeader title="Account management" />
            <Row title="Sign out" body="Sign out of this device." action={<Button variant="secondary" onClick={logout}><LogOut className="w-4 h-4" /> Sign out</Button>} />
            <Row title="Sign out everywhere" body="End every session, including this one." action={<Button variant="secondary" onClick={() => setConfirm('everywhere')}>Sign out everywhere</Button>} />
            <Row title="Download your data" body="A JSON copy of your account, profile, learning records, achievements and goals." action={<Button variant="secondary" onClick={() => void exportData()} busy={exporting}><Download className="w-4 h-4" /> Download</Button>} />

            {!isAdmin && (
                <div className="rounded-2xl border border-red-200 dark:border-red-500/30 p-5">
                    <h3 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Close account</h3>
                    {data.deletion_request ? (
                        <div className="mt-2 space-y-3">
                            <p className="text-sm text-gray-700 dark:text-gray-300">You asked to close your account on {formatDate(data.deletion_request.created_at)}. An administrator will review it; your account stays active until then.</p>
                            <Button variant="secondary" onClick={async () => {
                                try {
                                    await accountService.cancelDeletion();
                                    toast.success('Request cancelled');
                                    await onChanged();
                                } catch (err) {
                                    toast.error(apiErrorMessage(err, 'Could not cancel'));
                                }
                            }}>Cancel request</Button>
                        </div>
                    ) : (
                        <div className="mt-2 space-y-3">
                            <p className="text-sm text-gray-600 dark:text-gray-300">Ask for your account to be closed. An administrator reviews each request — course submissions, assessment results and certificates may be retained as academic records.</p>
                            <Field label="Reason (optional)"><TextInput value={reason} onChange={setReason} maxLength={500} /></Field>
                            <Button variant="danger" onClick={() => setConfirm('delete')}>Request account deletion</Button>
                        </div>
                    )}
                </div>
            )}

            {isAdmin && <AdminDeletionRequests />}

            {confirm === 'everywhere' && (
                <ConfirmDialog
                    title="Sign out everywhere?"
                    body="All devices, including this one, will be signed out."
                    confirmLabel="Sign out everywhere"
                    onClose={() => setConfirm(null)}
                    onConfirm={async () => {
                        await accountService.revokeAllSessions();
                        logout();
                    }}
                />
            )}
            {confirm === 'delete' && (
                <ConfirmDialog
                    title="Request account deletion?"
                    body="Your request goes to an administrator. You can cancel it until it’s reviewed."
                    confirmLabel="Submit request"
                    danger
                    requirePassword
                    onClose={() => setConfirm(null)}
                    onConfirm={async (password) => {
                        try {
                            await accountService.requestDeletion(password, reason);
                        } catch (err) {
                            throw new Error(apiErrorMessage(err, 'Could not submit request'));
                        }
                        setConfirm(null);
                        toast.success('Request submitted');
                        await onChanged();
                    }}
                />
            )}
        </div>
    );
}

function Row({ title, body, action }: { title: string; body: string; action: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p><p className="text-xs text-gray-500">{body}</p></div>
            {action}
        </div>
    );
}

function AdminDeletionRequests() {
    const [rows, setRows] = useState<DeletionRequestAdminView[] | null>(null);
    const load = useCallback(async () => {
        try {
            setRows(await accountService.adminDeletionRequests());
        } catch {
            setRows([]);
        }
    }, []);
    useEffect(() => { void load(); }, [load]);
    const resolve = async (id: string, status: 'completed' | 'rejected') => {
        try {
            await accountService.adminResolveDeletion(id, status);
            toast.success(status === 'completed' ? 'Marked as handled' : 'Request declined');
            await load();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not update'));
        }
    };
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Account deletion requests</h3>
            <p className="text-xs text-gray-500">Marking a request as handled records your decision only — close the account and handle academic records per the retention policy.</p>
            {!rows ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : rows.length === 0 ? <p className="text-sm text-gray-500">No pending requests.</p> : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800">
                    {rows.map((r) => (
                        <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                            <div className="flex-1 min-w-0">
                                <Link href={`/profile/${r.user.id}`} className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600">{r.user.name}</Link>
                                <p className="text-xs text-gray-500 truncate">{r.user.email} · {formatDate(r.created_at)}{r.reason ? ` · “${r.reason}”` : ''}</p>
                            </div>
                            <Button variant="secondary" onClick={() => void resolve(r.id, 'rejected')}>Decline</Button>
                            <Button onClick={() => void resolve(r.id, 'completed')}>Mark handled</Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
