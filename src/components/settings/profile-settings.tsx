"use client";

import { useMemo, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Plus, Star, X } from 'lucide-react';
import { accountService, apiErrorMessage } from '@/services/api/account.api';
import type { ProfileDetails, SkillEntry, SkillLevel } from '@/types/profile';
import { Field, SaveBar, SectionHeader, TextArea, TextInput, useUnsavedGuard } from './settings-ui';

const LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
const SUGGESTED_SKILLS = ['Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'SQL', 'Data Structures & Algorithms', 'HTML', 'CSS', 'Git'];

function TagInput({ value, onChange, placeholder, max = 15 }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; max?: number }) {
    const [draft, setDraft] = useState('');
    const add = () => {
        const v = draft.trim();
        if (!v || value.some((x) => x.toLowerCase() === v.toLowerCase()) || value.length >= max) return setDraft('');
        onChange([...value, v.slice(0, 50)]);
        setDraft('');
    };
    const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
        } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
    };
    return (
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 focus-within:ring-2 focus-within:ring-blue-500">
            {value.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-200">
                    {t}
                    <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700" aria-label={`Remove ${t}`}><X className="w-3 h-3" /></button>
                </span>
            ))}
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={add} placeholder={value.length ? '' : placeholder} className="flex-1 min-w-[8rem] bg-transparent text-sm text-gray-900 dark:text-white outline-none px-1" />
        </div>
    );
}

function SkillsEditor({ skills, onChange }: { skills: SkillEntry[]; onChange: (s: SkillEntry[]) => void }) {
    const [draft, setDraft] = useState('');
    const add = (name: string) => {
        const v = name.trim();
        if (!v || skills.some((s) => s.name.toLowerCase() === v.toLowerCase()) || skills.length >= 30) return;
        onChange([...skills, { name: v.slice(0, 50), level: null, primary: false }]);
        setDraft('');
    };
    const update = (i: number, patch: Partial<SkillEntry>) => onChange(skills.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    const primaryCount = skills.filter((s) => s.primary).length;
    const suggestions = SUGGESTED_SKILLS.filter((s) => !skills.some((x) => x.name.toLowerCase() === s.toLowerCase()));

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <TextInput value={draft} onChange={setDraft} placeholder="Add a skill, e.g. React" onEnter={() => add(draft)} />
                <button type="button" onClick={() => add(draft)} className="shrink-0 inline-flex items-center gap-1 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"><Plus className="w-4 h-4" /> Add</button>
            </div>
            {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {suggestions.slice(0, 8).map((s) => (
                        <button type="button" key={s} onClick={() => add(s)} className="px-2.5 py-1 rounded-full border border-dashed border-gray-300 dark:border-gray-700 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600">+ {s}</button>
                    ))}
                </div>
            )}
            {skills.length > 0 && (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800">
                    {skills.map((s, i) => (
                        <li key={s.name} className="flex flex-wrap items-center gap-2 px-3 py-2">
                            <button
                                type="button"
                                onClick={() => update(i, { primary: !s.primary })}
                                disabled={!s.primary && primaryCount >= 5}
                                className={`p-1 rounded ${s.primary ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'} disabled:opacity-40`}
                                aria-label={s.primary ? `Unmark ${s.name} as primary` : `Mark ${s.name} as primary`}
                                title={s.primary ? 'Primary skill' : primaryCount >= 5 ? 'Up to 5 primary skills' : 'Mark as primary'}
                            >
                                <Star className={`w-4 h-4 ${s.primary ? 'fill-current' : ''}`} />
                            </button>
                            <span className="flex-1 min-w-[6rem] text-sm font-medium text-gray-900 dark:text-white">{s.name}</span>
                            <select
                                value={s.level ?? ''}
                                onChange={(e) => update(i, { level: (e.target.value || null) as SkillLevel | null })}
                                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-700 dark:text-gray-200"
                                aria-label={`${s.name} level`}
                            >
                                <option value="">No level</option>
                                {LEVELS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
                            </select>
                            <button type="button" onClick={() => onChange(skills.filter((_, j) => j !== i))} className="p-1 rounded text-gray-400 hover:text-red-600" aria-label={`Remove ${s.name}`}><X className="w-4 h-4" /></button>
                        </li>
                    ))}
                </ul>
            )}
            <p className="text-xs text-gray-400">Star up to 5 primary skills — they appear first on your profile. Skills are shown as self-reported.</p>
        </div>
    );
}

/** Settings → Profile: the learning identity shown on the profile page. */
export function ProfileSettings({ initial, profileHref, onSaved }: { initial: ProfileDetails; profileHref: string; onSaved: (p: ProfileDetails) => void }) {
    const [form, setForm] = useState<ProfileDetails>(initial);
    const [saving, setSaving] = useState(false);
    const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
    useUnsavedGuard(dirty);

    const set = <K extends keyof ProfileDetails>(k: K, v: ProfileDetails[K]) => setForm((f) => ({ ...f, [k]: v }));
    const setEdu = (k: keyof ProfileDetails['education'], v: string | number | null) => setForm((f) => ({ ...f, education: { ...f.education, [k]: v } }));

    const save = async () => {
        for (const [label, url] of [['GitHub', form.github_url], ['LinkedIn', form.linkedin_url], ['Portfolio', form.portfolio_url]] as const) {
            if (url && !/^https?:\/\//i.test(url)) return void toast.error(`${label} link must start with https://`);
        }
        setSaving(true);
        try {
            const { avatar_url: _a, cover_url: _c, ...rest } = form;
            const saved = await accountService.updateProfile(rest);
            onSaved(saved);
            setForm(saved);
            toast.success('Profile saved');
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not save profile'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <SectionHeader title="Profile" description="How you appear to classmates and mentors. Every field is optional." action={<Link href={profileHref} className="text-sm font-semibold text-blue-600 hover:underline">View profile</Link>} />

            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Headline" hint="One line, e.g. “Aspiring full-stack developer”" className="sm:col-span-2"><TextInput value={form.headline} onChange={(v) => set('headline', v)} maxLength={120} /></Field>
                <Field label="About you" hint={`${form.bio.length}/500`} className="sm:col-span-2"><TextArea value={form.bio} onChange={(v) => set('bio', v)} maxLength={500} rows={4} /></Field>
                <Field label="Location"><TextInput value={form.location} onChange={(v) => set('location', v)} maxLength={80} placeholder="City, Country" /></Field>
            </div>

            <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Education</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="College / institution" className="sm:col-span-2"><TextInput value={form.education.institution} onChange={(v) => setEdu('institution', v)} maxLength={120} /></Field>
                    <Field label="Degree / qualification"><TextInput value={form.education.degree} onChange={(v) => setEdu('degree', v)} maxLength={120} placeholder="B.Tech, BCA…" /></Field>
                    <Field label="Area of study"><TextInput value={form.education.field_of_study} onChange={(v) => setEdu('field_of_study', v)} maxLength={120} placeholder="Computer Science" /></Field>
                    <Field label="Graduation year">
                        <TextInput type="number" value={form.education.graduation_year?.toString() ?? ''} onChange={(v) => setEdu('graduation_year', v ? Number(v) : null)} placeholder="2026" />
                    </Field>
                </div>
            </div>

            <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Skills & technologies</h3>
                <SkillsEditor skills={form.skills} onChange={(s) => set('skills', s)} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Career interests" hint="Press Enter after each"><TagInput value={form.career_interests} onChange={(v) => set('career_interests', v)} placeholder="Web development, Data science…" /></Field>
                <Field label="Preferred learning areas"><TagInput value={form.learning_areas} onChange={(v) => set('learning_areas', v)} placeholder="Backend, System design…" /></Field>
                <Field label="Personal interests" className="sm:col-span-2"><TagInput value={form.interests} onChange={(v) => set('interests', v)} placeholder="Chess, Music…" /></Field>
                <Field label="Career goals" hint={`${form.career_goals.length}/600`} className="sm:col-span-2"><TextArea value={form.career_goals} onChange={(v) => set('career_goals', v)} maxLength={600} rows={3} /></Field>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
                <Field label="GitHub"><TextInput value={form.github_url} onChange={(v) => set('github_url', v)} placeholder="https://github.com/…" /></Field>
                <Field label="LinkedIn"><TextInput value={form.linkedin_url} onChange={(v) => set('linkedin_url', v)} placeholder="https://linkedin.com/in/…" /></Field>
                <Field label="Portfolio"><TextInput value={form.portfolio_url} onChange={(v) => set('portfolio_url', v)} placeholder="https://…" /></Field>
            </div>

            <p className="text-xs text-gray-500">Profile picture and cover image are changed on your <Link href={profileHref} className="text-blue-600 hover:underline">profile page</Link>.</p>

            <SaveBar dirty={dirty} saving={saving} onSave={save} onReset={() => setForm(initial)} />
        </div>
    );
}
