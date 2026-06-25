"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, Search, X, Plus, Layers, BookOpen, DollarSign, FileText, Link as LinkIcon, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { courseGroupService } from '@/services/api/courseGroupService';
import { courseService } from '@/services/api/course.api';
import { Course } from '@/types/course';

/* ─────────────────────────── types ─────────────────────────── */
interface GroupForm {
    name: string;
    description: string;
    price: string;
    image_url: string;
    status: 'active' | 'inactive';
}

/* ─────────────────────────── step pill ─────────────────────── */
function StepPill({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-100 text-gray-400'}`}>
                {done ? <Check className="w-4 h-4" /> : num}
            </div>
            <span className={`text-sm font-semibold ${active ? 'text-gray-900' : done ? 'text-emerald-600' : 'text-gray-400'}`}>{label}</span>
        </div>
    );
}

/* ─────────────────────────── main component ─────────────────── */
export function CourseGroupCreation() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);

    // Step 1 state
    const [form, setForm] = useState<GroupForm>({ name: '', description: '', price: '', image_url: '', status: 'active' });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Step 2 state
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [addedCount, setAddedCount] = useState(0);
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');

    /* fetch group for edit */
    useEffect(() => {
        if (editId) {
            const fetchGroup = async () => {
                try {
                    const group = await courseGroupService.getGroupById(editId);
                    setForm({
                        name: group.name,
                        description: group.description || '',
                        price: String(group.price),
                        image_url: group.image_url || '',
                        status: (group.status as 'active' | 'inactive') || 'active'
                    });
                    setCreatedGroupId(editId);
                    if (group.courses && group.courses.length > 0) {
                        // courseId is always a MongoDB _id (ObjectId stored as string)
                        setSelected(new Set(group.courses.map(c =>
                            typeof c.courseId === 'string'
                                ? c.courseId
                                : String((c.courseId as any)._id ?? (c.courseId as any).id ?? c.courseId)
                        )));
                    }
                } catch (err) {
                    console.error('Failed to fetch group details:', err);
                    toast.error('Failed to load group details. Please try again.');
                }
            };
            fetchGroup();
        }
    }, [editId]);

    /* fetch all individual courses for Step 2 */
    const fetchCourses = useCallback(async () => {
        setLoadingCourses(true);
        try {
            const data = await courseService.getAllCourses();
            setCourses(data);
        } catch {
            // non-blocking — show empty state
        } finally {
            setLoadingCourses(false);
        }
    }, []);

    useEffect(() => {
        if (step === 2) fetchCourses();
    }, [step, fetchCourses]);

    /* Step 1 submit — create group */
    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        if (!form.name.trim()) return;
        setCreating(true);
        try {
            const payload: any = {
                name: form.name.trim(),
                status: form.status,
                ...(form.description && { description: form.description.trim() }),
                ...(form.price && { price: Number(form.price) }),
                ...(form.image_url && { image_url: form.image_url.trim() }),
            };

            if (editId) {
                await courseGroupService.updateGroup(editId, payload);
                setStep(2);
            } else {
                const group = await courseGroupService.createGroup(payload);
                setCreatedGroupId(group._id);
                setStep(2);
            }
        } catch (err: any) {
            setCreateError(err?.response?.data?.message || `Failed to ${editId ? 'update' : 'create'} group. Please try again.`);
        } finally {
            setCreating(false);
        }
    };

    /* toggle course selection */
    const toggleCourse = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    /* Step 2 submit — add selected courses */
    const handleAddCourses = async () => {
        if (!createdGroupId) return;
        setAdding(true);
        setAddError(null);
        let count = 0;
        try {
            // In edit mode, we might want to sync the whole list
            // For simplicity, let's keep the current add logic if the service only supports adding one by one
            // Ideally backend would have a "sync courses" endpoint

            // If editing, first remove all current courses then add new selection
            if (editId) {
                const group = await courseGroupService.getGroupById(editId);
                for (const existing of group.courses) {
                    const eId = typeof existing.courseId === 'string'
                        ? existing.courseId
                        : String((existing.courseId as any)._id ?? (existing.courseId as any).id ?? existing.courseId);
                    await courseGroupService.removeCourseFromGroup(editId, eId);
                }
            }

            for (const courseId of selected) {
                // courseId here is always the MongoDB _id string
                const course = courses.find(c => String(c._id) === courseId);
                if (!course) continue;
                await courseGroupService.addCourseToGroup(createdGroupId, courseId, course.title);
                count++;
            }
            setAddedCount(count);
            // Brief success pause then redirect
            setTimeout(() => router.push('/admin'), 1500);
        } catch (err: any) {
            setAddError(err?.response?.data?.message || 'Some courses could not be added. Please try again.');
        } finally {
            setAdding(false);
        }
    };

    /* filtered course list */
    const filtered = courses.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.difficulty ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const difficultyColor: Record<string, string> = {
        beginner: 'bg-emerald-100 text-emerald-700',
        intermediate: 'bg-amber-100 text-amber-700',
        advanced: 'bg-red-100 text-red-700',
    };

    /* ───────────────────────── render ───────────────────────── */
    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

            {/* Back */}
            <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 text-sm font-medium transition-colors group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to Dashboard
            </button>

            {/* Title */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    {editId ? 'Edit Course Group' : 'Create Course Group'}
                </h1>
                <p className="text-gray-500 mt-1">
                    {editId ? 'Update group details and courses.' : 'Bundle courses into a group to sell or organise together.'}
                </p>
            </div>

            {/* Step pills */}
            <div className="flex items-center gap-4 mb-10">
                <StepPill num={1} label="Group Details" active={step === 1} done={step === 2} />
                <div className="flex-1 h-px bg-gray-200" />
                <StepPill num={2} label="Add Courses" active={step === 2} done={false} />
            </div>

            {/* ── STEP 1: Group Details ── */}
            {step === 1 && (
                <form onSubmit={handleCreateGroup} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Group Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                                placeholder="e.g. Web Development Bundle"
                                required
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <textarea
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                rows={3}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition"
                                placeholder="What does this group include?"
                            />
                        </div>
                    </div>

                    {/* Price + Image URL side by side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bundle Price (₹)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="number"
                                    min="0"
                                    value={form.price}
                                    onChange={e => setForm({ ...form, price: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                                    placeholder="e.g. 2999"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cover Image URL</label>
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="url"
                                    value={form.image_url}
                                    onChange={e => setForm({ ...form, image_url: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status Toggle */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Visibility</label>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, status: form.status === 'active' ? 'inactive' : 'active' })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                    form.status === 'active' ? 'bg-indigo-600' : 'bg-gray-200'
                                }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                    form.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                            <span className={`text-sm font-medium ${
                                form.status === 'active' ? 'text-emerald-600' : 'text-gray-400'
                            }`}>
                                {form.status === 'active' ? '✓ Visible to students' : '✗ Hidden (inactive)'}
                            </span>
                        </div>
                    </div>

                    {/* Image preview */}
                    {form.image_url && (
                        <div className="rounded-xl overflow-hidden border border-gray-100 h-36 bg-gray-50">
                            <img src={form.image_url} alt="cover preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                    )}

                    {createError && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm">
                            <X className="w-4 h-4 flex-shrink-0" />{createError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={creating || !form.name.trim()}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/20"
                    >
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        {creating ? (editId ? 'Updating...' : 'Creating...') : (editId ? 'Update & Manage Courses' : 'Create Group & Add Courses')}
                    </button>
                </form>
            )}

            {/* ── STEP 2: Add Courses ── */}
            {step === 2 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Select Courses to Add</h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {selected.size > 0 ? `${selected.size} course${selected.size > 1 ? 's' : ''} selected` : 'Pick one or more courses to include in the group'}
                            </p>
                        </div>
                        {selected.size > 0 && (
                            <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                                Clear all
                            </button>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative mb-5">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by title or difficulty..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Course list */}
                    {loadingCourses ? (
                        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Loading courses...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16">
                            <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">{search ? 'No courses match your search.' : 'No courses found.'}</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                            {filtered.map(course => {
                                // Always use MongoDB _id since courseGroupRepository stores courseId as ObjectId ref
                                const id = String(course._id);
                                const isSelected = selected.has(id);
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => toggleCourse(id)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
                                            ${isSelected
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'}`}
                                    >
                                        {/* Checkbox visual */}
                                        <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-all
                                            ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>

                                        {/* Course info */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold text-sm truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                {course.title}
                                            </p>
                                            {course.description && (
                                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{course.description}</p>
                                            )}
                                        </div>

                                        {/* Meta badges */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {course.difficulty && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${difficultyColor[course.difficulty] ?? 'bg-gray-100 text-gray-500'}`}>
                                                    {course.difficulty}
                                                </span>
                                            )}
                                            {course.price !== undefined && (
                                                <span className="text-xs font-bold text-gray-700">₹{course.price}</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Errors / success */}
                    {addError && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm mt-4">
                            <X className="w-4 h-4 flex-shrink-0" />{addError}
                        </div>
                    )}
                    {addedCount > 0 && (
                        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm mt-4">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            {addedCount} course{addedCount > 1 ? 's' : ''} added! Redirecting...
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => router.push('/admin')}
                            className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                        >
                            Skip for now
                        </button>
                        <button
                            onClick={handleAddCourses}
                            disabled={selected.size === 0 || adding || addedCount > 0}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/20"
                        >
                            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {adding ? 'Adding...' : `Add ${selected.size || ''} Course${selected.size !== 1 ? 's' : ''} to Group`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
