"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    Calendar, Camera, Check, Eye, Github, Globe, Linkedin, Loader2, Lock, Mail, MapPin, MessageCircle,
    Pencil, RotateCcw, Share2, ShieldCheck, UserCheck, UserPlus, Users, X,
} from 'lucide-react';
import { accountService, apiErrorMessage, profileService, type ProfilePreview } from '@/services/api/account.api';
import { chatService } from '@/services/api/chat.api';
import { chatSocialService } from '@/services/api/chat-social.api';
import { formatDate } from '@/stores/preferences-store';
import { avatarColorFor, initialsOf } from '@/lib/chat-utils';
import type { ProfileFull, ProfileView } from '@/types/profile';
import { ImageCropDialog, validateImageFile } from './image-crop-dialog';
import {
    AboutCard, AchievementsCard, ActivityCard, CertificatesCard, CompletionCard, GoalsCard,
    LeaderboardCard, LearningOverview, ProblemSolvingCard, SkillsCard, StatsGrid,
} from './profile-sections';

const VISIBILITY_LABEL = { public: 'Public profile', students: 'Visible to students', private: 'Private profile' } as const;

function Avatar({ name, id, url, size }: { name: string; id: string; url: string | null; size: number }) {
    return url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt="" className="rounded-full object-cover ring-4 ring-white dark:ring-gray-900" style={{ width: size, height: size }} />
        : (
            <span className={`rounded-full ${avatarColorFor(id)} text-white font-black flex items-center justify-center ring-4 ring-white dark:ring-gray-900`} style={{ width: size, height: size, fontSize: size * 0.36 }}>
                {initialsOf(name)}
            </span>
        );
}

function MetaChip({ icon: Icon, href, children }: { icon: typeof MapPin; href?: string; children: React.ReactNode }) {
    const cls = 'inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-1';
    return (
        <li>
            {href
                ? <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-300 transition-colors`}><Icon className="w-3.5 h-3.5" />{children}</a>
                : <span className={cls}><Icon className="w-3.5 h-3.5 text-gray-400" />{children}</span>}
        </li>
    );
}

function PageSkeleton() {
    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-pulse">
            <div className="h-40 sm:h-52 rounded-3xl bg-gray-200 dark:bg-gray-800" />
            <div className="-mt-12 ml-6 w-28 h-28 rounded-full bg-gray-300 dark:bg-gray-700 ring-4 ring-white dark:ring-gray-900" />
            <div className="mt-4 h-6 w-48 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800" />)}</div>
        </div>
    );
}

/**
 * A student's learning identity. `mode="public"` is the shareable /u/:username
 * page (works signed out); the owner can preview exactly what others see.
 * Everything shown comes from the server, already filtered by privacy rules.
 */
export function ProfilePage({ idOrUsername, mode = 'app' }: { idOrUsername: string; mode?: 'app' | 'public' }) {
    const router = useRouter();
    const [profile, setProfile] = useState<ProfileView | null>(null);
    const [error, setError] = useState<{ status?: number; message: string } | null>(null);
    const [preview, setPreview] = useState<ProfilePreview | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [cropping, setCropping] = useState<{ file: File; kind: 'avatar' | 'cover' } | null>(null);
    const avatarInput = useRef<HTMLInputElement>(null);
    const coverInput = useRef<HTMLInputElement>(null);
    const isPublic = mode === 'public';

    const load = useCallback(async () => {
        setError(null);
        try {
            setProfile(isPublic ? await profileService.getPublic(idOrUsername) : await profileService.get(idOrUsername, preview ?? undefined));
        } catch (err) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            setError({ status, message: apiErrorMessage(err, 'Could not load this profile') });
        }
    }, [idOrUsername, isPublic, preview]);

    useEffect(() => {
        setProfile(null);
        void load();
    }, [load]);

    const pickImage = (kind: 'avatar' | 'cover') => (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const problem = validateImageFile(file);
        if (problem) return void toast.error(problem);
        setCropping({ file, kind });
    };

    const uploadCropped = async (file: File) => {
        const kind = cropping!.kind;
        const [uploaded] = await chatService.uploadAttachments([file]);
        if (!uploaded?.url) throw new Error('Upload failed');
        await accountService.updateProfile(kind === 'avatar' ? { avatar_url: uploaded.url } : { cover_url: uploaded.url });
        setCropping(null);
        toast.success(kind === 'avatar' ? 'Profile picture updated' : 'Cover image updated');
        await load();
    };

    const removeImage = async (kind: 'avatar' | 'cover') => {
        try {
            await accountService.updateProfile(kind === 'avatar' ? { avatar_url: null } : { cover_url: null });
            await load();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not remove image'));
        }
    };

    const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
        setBusy(key);
        try {
            await fn();
            if (ok) toast.success(ok);
            await load();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Something went wrong'));
        } finally {
            setBusy(null);
        }
    };

    if (error) {
        const notFound = error.status === 404;
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <span className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">{notFound ? <Users className="w-7 h-7 text-gray-400" /> : <RotateCcw className="w-7 h-7 text-gray-400" />}</span>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">{notFound ? (isPublic ? 'This profile isn\'t public' : 'Profile not found') : 'Couldn\'t load this profile'}</h1>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">{notFound ? (isPublic ? 'The owner hasn\'t shared it publicly, or the link is wrong.' : 'It may have been removed or the link is wrong.') : error.message}</p>
                {!notFound && <button onClick={() => void load()} className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">Try again</button>}
                {isPublic && notFound && <Link href="/login" className="mt-4 text-sm font-semibold text-blue-600 hover:underline">Sign in to see more</Link>}
            </div>
        );
    }
    if (!profile) return <PageSkeleton />;

    if (profile.restricted) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <Avatar name={profile.user.name} id={profile.user.id} url={profile.user.avatar_url} size={96} />
                <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{profile.user.name}</h1>
                {profile.user.username && <p className="text-sm text-gray-500">@{profile.user.username}</p>}
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-500"><Lock className="w-4 h-4" /> This profile is private</p>
            </div>
        );
    }

    const p = profile as ProfileFull;
    const self = p.viewer.relation === 'self';
    const isOwnerPreview = !isPublic && preview !== null; // owner looking through others' eyes
    const academic = p.academic;
    const shareUrl = p.share_path && typeof window !== 'undefined' ? `${window.location.origin}${p.share_path}` : null;

    const share = async () => {
        if (!shareUrl) return;
        try {
            if (navigator.share) await navigator.share({ title: `${p.user.name} on Freshkite`, url: shareUrl });
            else {
                await navigator.clipboard.writeText(shareUrl);
                toast.success('Profile link copied');
            }
        } catch {
            /* share sheet dismissed */
        }
    };

    const actions = (
        <>
            {self && !isOwnerPreview && (
                <>
                    <Link href="/settings?section=profile" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"><Pencil className="w-4 h-4" /> Edit profile</Link>
                    <PreviewMenu onPick={setPreview} />
                </>
            )}
            {shareUrl && !isOwnerPreview && (
                <button onClick={() => void share()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"><Share2 className="w-4 h-4" /> Share</button>
            )}
            {p.viewer.relation === 'member' && !isPublic && (
                <>
                    <button
                        onClick={() => run('msg', async () => router.push(`/chat/${(await chatService.createDirect(p.user.id)).id}`))}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
                    >
                        {busy === 'msg' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />} Message
                    </button>
                    <FriendButton status={p.friendship_status} busy={busy === 'friend'} onAdd={() => run('friend', () => chatSocialService.sendFriendRequest(p.user.id), 'Friend request sent')} />
                </>
            )}
        </>
    );

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {isOwnerPreview && (
                <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-200">
                    <span className="inline-flex items-center gap-2"><Eye className="w-4 h-4" /> Previewing your profile as {preview === 'public' ? 'a visitor (public link)' : 'another student'}</span>
                    <button onClick={() => setPreview(null)} className="inline-flex items-center gap-1 font-semibold hover:underline"><X className="w-4 h-4" /> Exit preview</button>
                </div>
            )}

            {/* ── Header ── */}
            <section className="relative rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="relative h-32 sm:h-44 rounded-t-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600">
                    {p.user.cover_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.user.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    {self && !isOwnerPreview && (
                        <div className="absolute top-3 right-3 flex gap-2">
                            <input ref={coverInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickImage('cover')} />
                            <button onClick={() => coverInput.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/55 text-white text-xs font-semibold backdrop-blur-sm">
                                <Camera className="w-4 h-4" /> {p.user.cover_url ? 'Change cover' : 'Add cover'}
                            </button>
                            {p.user.cover_url && <button onClick={() => void removeImage('cover')} className="px-2 py-1.5 rounded-lg bg-black/40 hover:bg-black/55 text-white" aria-label="Remove cover"><X className="w-4 h-4" /></button>}
                        </div>
                    )}
                </div>

                <div className="px-5 sm:px-8 pb-6">
                    {/* Only the avatar overlaps the cover; it sits above it (z-10). */}
                    <div className="flex items-end justify-between gap-4 -mt-14 sm:-mt-16">
                        <div className="relative z-10 shrink-0">
                            <Avatar name={p.user.name} id={p.user.id} url={p.user.avatar_url} size={128} />
                            {self && !isOwnerPreview && (
                                <>
                                    <input ref={avatarInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickImage('avatar')} />
                                    <button
                                        onClick={() => avatarInput.current?.click()}
                                        className="absolute bottom-1.5 right-1.5 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md ring-[3px] ring-white dark:ring-gray-900"
                                        aria-label="Change profile picture"
                                        title="Change profile picture"
                                    >
                                        <Camera className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                        <div className="hidden sm:flex flex-wrap justify-end gap-2 pb-2">{actions}</div>
                    </div>

                    {/* Identity */}
                    <div className="mt-4 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white break-words">{p.user.name}</h1>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                                {p.user.role === 'admin' ? 'Administrator' : p.user.role === 'teacher' ? 'Mentor' : 'Student'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                <ShieldCheck className="w-3 h-3" /> Active
                            </span>
                        </div>
                        {p.user.username && <p className="mt-0.5 text-sm font-medium text-gray-500 dark:text-gray-400">@{p.user.username}</p>}
                        {p.user.headline && <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">{p.user.headline}</p>}

                        <ul className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
                            {p.user.location && <MetaChip icon={MapPin}>{p.user.location}</MetaChip>}
                            {p.user.email && <MetaChip icon={Mail}>{p.user.email}</MetaChip>}
                            {p.user.joined_at && <MetaChip icon={Calendar}>Joined {formatDate(p.user.joined_at)}</MetaChip>}
                            {self && <MetaChip icon={Lock}>{VISIBILITY_LABEL[p.visibility]}</MetaChip>}
                            {p.user.links.github && <MetaChip icon={Github} href={p.user.links.github}>GitHub</MetaChip>}
                            {p.user.links.linkedin && <MetaChip icon={Linkedin} href={p.user.links.linkedin}>LinkedIn</MetaChip>}
                            {p.user.links.portfolio && <MetaChip icon={Globe} href={p.user.links.portfolio}>Portfolio</MetaChip>}
                        </ul>
                    </div>

                    {/* Actions on phones go under the details, full width. */}
                    <div className="sm:hidden mt-5 grid grid-cols-2 gap-2 [&>*]:justify-center">{actions}</div>
                </div>
            </section>

            {self && !isOwnerPreview && p.completion && <CompletionCard completion={p.completion} />}

            {academic && <StatsGrid stats={academic.stats} />}

            <div className="grid lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    {academic?.courses && <LearningOverview profile={p} />}
                    {academic?.courses && <ProblemSolvingCard profileKey={isPublic ? idOrUsername : p.user.id} isPublic={isPublic} />}
                    {academic?.activity && <ActivityCard profile={p} profileKey={isPublic ? idOrUsername : p.user.id} isPublic={isPublic} />}
                    {academic?.achievements && <AchievementsCard achievements={academic.achievements} />}
                </div>
                <div className="space-y-6">
                    <AboutCard profile={p} />
                    {p.skills && <SkillsCard profile={p} />}
                    {academic?.leaderboard && <LeaderboardCard lb={academic.leaderboard} />}
                    {academic?.goals && !isOwnerPreview && <GoalsCard initial={academic.goals} courses={academic.courses ?? []} />}
                    {academic?.certificates && <CertificatesCard certificates={academic.certificates} />}
                    {!academic && p.user.role !== 'student' && (
                        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 text-sm text-gray-600 dark:text-gray-300">
                            {self ? 'Learning statistics appear on student profiles. Manage your account in Settings.' : `${p.user.name} is part of the Freshkite team.`}
                            {self && <Link href="/settings" className="block mt-2 font-semibold text-blue-600 hover:underline">Open settings</Link>}
                        </section>
                    )}
                </div>
            </div>

            {cropping && (
                <ImageCropDialog
                    file={cropping.file}
                    aspect={cropping.kind === 'avatar' ? 1 : 4}
                    outputWidth={cropping.kind === 'avatar' ? 512 : 1600}
                    shape={cropping.kind === 'avatar' ? 'circle' : 'rect'}
                    title={cropping.kind === 'avatar' ? 'Profile picture' : 'Cover image'}
                    onCancel={() => setCropping(null)}
                    onCropped={uploadCropped}
                />
            )}
            {self && !isOwnerPreview && p.user.avatar_url && (
                <div className="text-center"><button onClick={() => void removeImage('avatar')} className="text-xs text-gray-400 hover:text-red-600 hover:underline">Remove profile picture</button></div>
            )}
        </div>
    );
}

function PreviewMenu({ onPick }: { onPick: (p: ProfilePreview) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);
    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800" aria-haspopup="menu" aria-expanded={open}>
                <Eye className="w-4 h-4" /> Preview
            </button>
            {open && (
                <div role="menu" className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl py-1 z-30">
                    <button role="menuitem" onClick={() => { setOpen(false); onPick('student'); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">As another student</button>
                    <button role="menuitem" onClick={() => { setOpen(false); onPick('public'); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">As a visitor (public link)</button>
                </div>
            )}
        </div>
    );
}

function FriendButton({ status, busy, onAdd }: { status: ProfileFull['friendship_status']; busy: boolean; onAdd: () => void }) {
    const base = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold';
    if (status === 'friends') return <span className={`${base} border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300`}><UserCheck className="w-4 h-4" /> Friends</span>;
    if (status === 'request_sent') return <span className={`${base} border-gray-200 dark:border-gray-700 text-gray-500`}><Check className="w-4 h-4" /> Requested</span>;
    if (status === 'request_received') return <Link href="/friends" className={`${base} border-blue-200 text-blue-700 dark:border-blue-500/30 dark:text-blue-300`}><UserPlus className="w-4 h-4" /> Respond to request</Link>;
    return (
        <button onClick={onAdd} disabled={busy} className={`${base} border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60`}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add friend
        </button>
    );
}
