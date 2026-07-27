
"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Video, FileText, Type, Save, Eye, Trash2, Table2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { courseService } from '@/services/api/course.api';
import { courseGroupService } from '@/services/api/courseGroupService';
import { problemCourseService } from '@/services/api/problem-course.api';
import type { PreviewResult } from '@/types/problem-course';

const templates = [
    {
        id: 'video-only',
        name: 'Video Only',
        description: 'Course content with video lectures only',
        icon: Video,
        color: 'bg-red-100 text-red-600'
    },
    {
        id: 'text-video',
        name: 'Text and Video',
        description: 'Text content with video lectures — supports images embedded directly in the source document',
        icon: FileText,
        color: 'bg-blue-100 text-blue-600'
    },
    {
        id: 'text-only',
        name: 'Text Only',
        description: 'Pure text-based learning content',
        icon: Type,
        color: 'bg-purple-100 text-purple-600'
    },
    {
        id: 'problem-solving',
        name: 'Problem Solving Template',
        description: 'Auto-build an interactive DSA tracker from a Google Sheet',
        icon: Table2,
        color: 'bg-indigo-100 text-indigo-600'
    }
];

const CATEGORIES = [
    { id: 'web_development', name: 'Web Development' },
    { id: 'mobile_development', name: 'Mobile Development' },
    { id: 'dsa', name: 'DSA' },
    { id: 'problem_solving', name: 'Problem Solving' },
    { id: 'devops', name: 'DevOps' },
    { id: 'ai_ml', name: 'AI & Machine Learning' },
    { id: 'data-science', name: 'Data Science' },
    { id: 'cloud', name: 'Cloud Computing' },
    { id: 'other', name: 'Other' }
];

export function CourseCreation() {
    const router = useRouter();
    const [step, setStep] = useState<'template' | 'details' | 'content'>('template');
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [courseData, setCourseData] = useState({
        title: '',
        description: '',
        category: 'web_development', // Default valid value
        groupId: '',
        duration: '',
        difficulty: 'beginner',
        price: '',
        thumbnail_url: ''
    });
    const [sections, setSections] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
    const [docLink, setDocLink] = useState('');
    // Problem-solving template: Google Sheet URL + parsed preview results.
    const [sheetUrl, setSheetUrl] = useState('');
    const [sheetPreview, setSheetPreview] = useState<PreviewResult | null>(null);
    const [processingSheet, setProcessingSheet] = useState(false);
    const [groups, setGroups] = useState<any[]>([]);
    // Server-side section IDs that were replaced by a new doc process — must be
    // deleted from the server before the new sections are saved.
    const [removedServerIds, setRemovedServerIds] = useState<string[]>([]);
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');

    useEffect(() => {
        if (editId) {
            const fetchCourse = async () => {
                try {
                    const course = await courseService.getCourseById(editId);
                    setCourseData({
                        title: course.title,
                        description: course.description || '',
                        category: (course.category as string) || 'other',
                        groupId: typeof course.group === 'string' ? course.group : course.group?._id || '',
                        duration: String(course.estimated_duration || ''),
                        difficulty: course.difficulty || 'beginner',
                        price: String(course.price),
                        thumbnail_url: course.thumbnail_url || ''
                    });
                    setSelectedTemplate(course.template_type || null);

                    // Problem-solving: prefill the sheet URL + show the already-parsed
                    // results so the Content step has data without re-processing.
                    if (course.template_type === 'problem-solving') {
                        setSheetUrl(course.problem_sheet?.url || '');
                        const secs = (course.problem_sections || []) as Array<{ title: string; icon: string; problems?: unknown[] }>;
                        setSheetPreview({
                            spreadsheetId: course.problem_sheet?.spreadsheet_id || '',
                            warnings: course.problem_sheet?.last_warnings || [],
                            stats: {
                                sectionCount: secs.length,
                                problemCount: secs.reduce((n, s) => n + (s.problems?.length || 0), 0),
                                duplicatesSkipped: 0,
                                sectionsMerged: 0,
                                invalidUrlsSkipped: 0,
                                difficultyDefaulted: 0,
                            },
                            sections: secs.map(s => ({ title: s.title, icon: s.icon, problemCount: s.problems?.length || 0 })),
                        });
                    }

                    if (course.sections && course.sections.length > 0) {
                        setSections(course.sections.map((s: any, idx: number) => ({
                            id: idx + 1,
                            serverId: s.id, // server-side section id, needed to delete persisted sections
                            title: s.title,
                            content: s.content,
                            videoUrl: s.video_url,
                            youtube_videos: s.youtube_videos || [],
                            assignments: s.assignments || [],
                            resources: s.resources || [],
                            persisted: true // already saved on the server — don't re-add on save
                        })));
                    } else {
                        setSections([{ id: 1, title: '', content: '', videoUrl: '', youtube_videos: [], assignments: [], resources: [], persisted: false }]);
                    }
                    setCreatedCourseId(editId);
                    setStep('details'); // Start directly at details if editing
                } catch (err) {
                    console.error('Failed to fetch course details:', err);
                    toast.error('Failed to load course details. Please try again.');
                }
            };
            fetchCourse();
        }
    }, [editId]);

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const data = await courseGroupService.getAllGroups();
                setGroups(data || []);
            } catch (err) {
                console.error('Failed to fetch groups:', err);
            }
        };
        fetchGroups();
    }, []);

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplate(templateId);
        // Problem-solving courses live in the "problem_solving" category; default
        // it so the (shared) details form is pre-filled sensibly.
        if (templateId === 'problem-solving') {
            setCourseData(prev => ({ ...prev, category: 'problem_solving' }));
        }
        setStep('details');
    };

    /**
     * Problem-solving template: parse the Google Sheet and show the results
     * (sections + problem counts) WITHOUT creating the course yet — mirrors the
     * "Process Document" preview used by the other templates.
     */
    const handleProcessSheet = async () => {
        if (!sheetUrl) return;
        try {
            setProcessingSheet(true);
            const preview = await problemCourseService.preview(sheetUrl);
            setSheetPreview(preview);
            toast.success(`Found ${preview.stats.problemCount} problems across ${preview.stats.sectionCount} sections`);
        } catch (err: any) {
            setSheetPreview(null);
            toast.error(
                err?.response?.data?.error?.message ||
                    err?.message ||
                    'Failed to process sheet. Make sure it is shared for viewing.'
            );
        } finally {
            setProcessingSheet(false);
        }
    };

    /**
     * Save a problem-solving course. In EDIT mode (createdCourseId present) this
     * updates the existing course's metadata and re-reads the sheet — it never
     * creates a duplicate. Otherwise it imports a brand-new course.
     */
    const saveProblemCourse = async (): Promise<string | null> => {
        if (createdCourseId) {
            await courseService.update(createdCourseId, {
                title: courseData.title,
                description: courseData.description,
                category: 'problem_solving',
                group: courseData.groupId || undefined,
                difficulty: courseData.difficulty,
                price: Number(courseData.price) || 0,
                thumbnail_url: courseData.thumbnail_url,
            });
            // Re-read the (possibly changed) sheet; preserves student progress.
            await problemCourseService.sync(createdCourseId, sheetUrl || undefined);
            return createdCourseId;
        }

        const res = await problemCourseService.import({
            title: courseData.title,
            description: courseData.description,
            coverImage: courseData.thumbnail_url || undefined,
            sheetUrl,
            price: Number(courseData.price) || 0,
            difficulty: courseData.difficulty as any,
            group: courseData.groupId || undefined,
            publish: false,
        });
        return res.course.id || res.course._id || null;
    };

    const handleDetailsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setStep('content');
        // Only seed an empty section if none exist yet (preserve doc-parsed/edited sections)
        setSections(prev => prev.length > 0 ? prev : [{ id: 1, title: '', content: '', videoUrl: '', youtube_videos: [], assignments: [], resources: [], persisted: false }]);
    };

    const addSection = () => {
        setSections([...sections, {
            id: sections.length + 1,
            title: '',
            content: '',
            videoUrl: '',
            youtube_videos: [],
            assignments: [],
            resources: [],
            persisted: false
        }]);
    };

    const updateSection = (id: number, field: string, value: string) => {
        setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    /**
     * Remove a section from the editor. If the section is already saved on the
     * server (persisted with a serverId), delete it there too; otherwise just
     * drop it from local state.
     */
    const deleteSection = async (section: any) => {
        if (!window.confirm(`Delete "${section.title?.trim() || 'this section'}"? This cannot be undone.`)) {
            return;
        }
        try {
            setDeletingId(section.id);
            if (section.persisted && section.serverId && createdCourseId) {
                await courseService.deleteSection(createdCourseId, section.serverId);
            }
            setSections(prev => prev.filter(s => s.id !== section.id));
            toast.success('Section deleted');
        } catch (err) {
            console.error('Failed to delete section:', err);
            toast.error('Failed to delete section. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    /**
     * Process a Google Doc: parse it into structured sections and load them into
     * the editor. Admin-entered metadata is the source of truth — parsed metadata
     * is only used to fill fields the admin left blank, and NEVER overrides input.
     */
    const handleProcessDoc = async () => {
        if (!docLink) return;
        try {
            setIsSaving(true);
            const parsed = await courseService.parseDoc(docLink);

            if (!parsed.sections || parsed.sections.length === 0) {
                toast.error('No content sections could be extracted from this document.');
                return;
            }

            // Any currently-persisted sections are about to be replaced.
            // Record their server IDs so saveCourse() can delete them first.
            const replacedIds = sections
                .filter(s => s.persisted && s.serverId)
                .map(s => s.serverId as string);
            if (replacedIds.length > 0) {
                setRemovedServerIds(prev => [...prev, ...replacedIds]);
            }

            // Map parsed sections into editor state (all new → persisted: false).
            // Embedded images are already inline in `content` (uploaded to R2 and
            // positioned exactly where they appeared in the doc) — nothing extra
            // to wire up here; content_blocks is carried through for the API.
            const mapped = parsed.sections.map((s, idx) => ({
                id: idx + 1,
                title: s.title,
                content: s.content || '',
                videoUrl: '',
                youtube_videos: s.youtubeVideos || [],
                assignments: s.assignments || [],
                resources: s.resources || [],
                content_blocks: s.contentBlocks || [],
                persisted: false
            }));
            setSections(mapped);

            // Fill ONLY blank metadata fields from parsed suggestions
            setCourseData(prev => ({
                ...prev,
                title: prev.title || parsed.metadata.title || '',
                description: prev.description || parsed.metadata.description || '',
                duration: prev.duration || (parsed.metadata.estimated_duration ? String(parsed.metadata.estimated_duration) : ''),
            }));

            const videoCount = mapped.reduce((n, s) => n + s.youtube_videos.length, 0);
            const assignmentCount = mapped.reduce((n, s) => n + s.assignments.length, 0);
            const imageCount = mapped.reduce(
                (n, s) => n + s.content_blocks.filter((b: any) => b.type === 'image').length, 0
            );
            toast.success(`Imported ${mapped.length} sections, ${videoCount} videos, ${imageCount} images, ${assignmentCount} assignments`);

            if (parsed.warnings && parsed.warnings.length > 0) {
                toast.error(`${parsed.warnings.length} warning${parsed.warnings.length === 1 ? '' : 's'}: ${parsed.warnings[0]}`);
            }
        } catch (err: any) {
            console.error(err);
            // Prefer the server's specific reason (e.g. server not configured,
            // non-native Google Doc) over the generic sharing hint, which is only
            // the right guidance when Google actually denied access.
            const serverMessage = err?.response?.data?.message;
            toast.error(serverMessage || 'Failed to process document. Make sure it is a shared Google Doc.');
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Persist the course as a draft. Returns the course id, or null on failure.
     * Sections already saved on the server (persisted: true) are skipped to avoid
     * duplicates; newly added/parsed sections are inserted and marked persisted.
     */
    const saveCourse = async (): Promise<string | null> => {
        let courseId = createdCourseId;
        if (!courseId) {
            const newCourse = await courseService.create({
                title: courseData.title,
                description: courseData.description,
                category: courseData.category,
                groupId: courseData.groupId,
                difficulty: courseData.difficulty,
                estimatedDuration: courseData.duration,
                templateType: selectedTemplate,
                price: Number(courseData.price) || 0,
                thumbnail_url: courseData.thumbnail_url
            });
            courseId = newCourse.id || newCourse._id || null;
            setCreatedCourseId(courseId);
        } else {
            await courseService.update(courseId, {
                title: courseData.title,
                description: courseData.description,
                category: courseData.category,
                group: courseData.groupId || undefined,
                difficulty: courseData.difficulty,
                estimated_duration: Number(courseData.duration),
                template_type: selectedTemplate,
                price: Number(courseData.price),
                thumbnail_url: courseData.thumbnail_url
            });
        }

        if (!courseId) throw new Error('Course id missing after save');

        // Delete server sections that were replaced when the admin re-processed
        // a Google Doc. Without this, the old sections stay on the server and
        // appear alongside (or instead of) the new content in the preview.
        if (removedServerIds.length > 0) {
            for (const sectionId of removedServerIds) {
                try {
                    await courseService.deleteSection(courseId, sectionId);
                } catch (err) {
                    console.error(`Failed to delete replaced section ${sectionId}:`, err);
                }
            }
            setRemovedServerIds([]);
        }

        // A section must carry SOMETHING to be saveable — this mirrors the
        // server's validation. Bare headings (common in large parsed docs) have
        // no body and would be rejected with a 400, so we skip them here rather
        // than let one empty section abort the whole save.
        // Embedded images live inline within `content` (as markdown image tags),
        // so a section with only images still passes the content check below.
        const hasBody = (s: any): boolean =>
            !!(s.content?.trim()) ||
            !!(s.videoUrl?.trim()) ||
            (s.youtube_videos?.length || 0) > 0 ||
            (s.assignments?.length || 0) > 0 ||
            (s.resources?.length || 0) > 0;

        // Insert only sections that have a title + body and are not yet persisted.
        const persistedIds = new Set<number>();
        const failed: { title: string; reason: string }[] = [];

        for (const section of sections) {
            if (section.persisted) continue;
            if (!section.title?.trim() || !hasBody(section)) continue;

            try {
                await courseService.addSection(courseId, {
                    title: section.title,
                    orderIndex: section.id,
                    duration: 0,
                    content: section.content || '',
                    videoUrl: section.videoUrl || '',
                    youtube_videos: section.youtube_videos || [],
                    assignments: section.assignments || [],
                    resources: section.resources || [],
                    content_blocks: section.content_blocks || undefined
                });
                persistedIds.add(section.id);
            } catch (err: any) {
                // Keep going so one bad section doesn't lose the rest of the work.
                const reason = err?.response?.data?.message || err?.message || 'Unknown error';
                console.error(`Failed to save section "${section.title}":`, reason);
                failed.push({ title: section.title, reason });
            }
        }

        // Mark only the sections that actually saved as persisted, so a retry
        // re-attempts the failed ones without duplicating successful ones.
        setSections(prev => prev.map(s =>
            persistedIds.has(s.id) ? { ...s, persisted: true } : s
        ));

        if (failed.length > 0) {
            throw new Error(
                `${failed.length} section${failed.length === 1 ? '' : 's'} failed to save: ${failed[0].reason}`
            );
        }

        return courseId;
    };

    const isProblemSolving = selectedTemplate === 'problem-solving';

    const handleSaveDraft = async () => {
        try {
            setIsSaving(true);
            if (isProblemSolving) {
                await saveProblemCourse();
                toast.success(createdCourseId ? 'Problem-solving course updated' : 'Problem-solving course saved as draft');
            } else {
                await saveCourse();
                toast.success('Course saved as draft');
            }
            router.push('/admin');
        } catch (error: any) {
            console.error('Failed to save course:', error);
            toast.error(error?.response?.data?.error?.message || error?.message || 'Failed to save course. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAndPreview = async () => {
        try {
            setIsSaving(true);
            const courseId = isProblemSolving ? await saveProblemCourse() : await saveCourse();
            if (courseId) {
                router.push(`/admin/courses/${courseId}/preview`);
            }
        } catch (error: any) {
            console.error('Failed to save course:', error);
            toast.error(error?.response?.data?.error?.message || error?.message || 'Failed to save course. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.push('/admin')}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Dashboard
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {editId ? 'Edit Course' : 'Create New Course'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    {editId ? 'Update your course details and content' : 'Choose a template and create your course content'}
                </p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
                <div className="flex items-center justify-center gap-4">
                    {['Template', 'Details', 'Content', 'Preview'].map((label, index) => (
                        <div key={label} className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium transition-colors ${(step === 'template' && index === 0) ||
                                    (step === 'details' && index === 1) ||
                                    (step === 'content' && index === 2)
                                    ? 'bg-blue-600 text-white'
                                    : index < ['template', 'details', 'content'].indexOf(step)
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                    }`}>
                                    {index + 1}
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                            </div>
                            {index < 3 && <div className="w-12 h-0.5 bg-gray-300 dark:bg-gray-700" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step 1: Template Selection */}
            {step === 'template' && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 text-center">Select Course Template</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => handleTemplateSelect(template.id)}
                                className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-600 dark:hover:border-blue-500 transition-all hover:shadow-lg text-left"
                            >
                                <div className={`w-16 h-16 ${template.color} dark:bg-opacity-20 rounded-xl flex items-center justify-center mb-4`}>
                                    <template.icon className="w-8 h-8" />
                                </div>
                                <h4 className="text-gray-900 dark:text-white font-medium mb-2">{template.name}</h4>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">{template.description}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: Course Details */}
            {step === 'details' && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Course Details</h3>
                        <form onSubmit={handleDetailsSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Course Title</label>
                                <input
                                    type="text"
                                    value={courseData.title}
                                    onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    placeholder="e.g., React Fundamentals"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                <textarea
                                    value={courseData.description}
                                    onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    placeholder="Describe what students will learn"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                                    <select
                                        value={courseData.category}
                                        onChange={(e) => setCourseData({ ...courseData, category: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        required
                                    >
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Course Group (Optional)</label>
                                    <select
                                        value={courseData.groupId}
                                        onChange={(e) => setCourseData({ ...courseData, groupId: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    >
                                        <option value="">No Group</option>
                                        {groups.map((group) => (
                                            <option key={group._id} value={group._id}>
                                                {group.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Price (INR)</label>
                                    <input
                                        type="number"
                                        value={courseData.price}
                                        onChange={(e) => setCourseData({ ...courseData, price: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="e.g., 999"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Cover Image URL</label>
                                    <input
                                        type="url"
                                        value={courseData.thumbnail_url}
                                        onChange={(e) => setCourseData({ ...courseData, thumbnail_url: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="https://images.unsplash.com/..."
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Estimated Duration (hours)</label>
                                <input
                                    type="number"
                                    value={courseData.duration}
                                    onChange={(e) => setCourseData({ ...courseData, duration: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    placeholder="e.g., 8"
                                    required
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setStep('template')}
                                    className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                >
                                    Next: Add Content
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Step 3: Content Creation */}
            {step === 'content' && (
                <div>
                    {isProblemSolving ? (
                    /* Problem-solving: process a Google Sheet and preview the results */
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Import from Google Sheet</h3>

                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6">
                            <div className="flex items-start gap-4">
                                <Table2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-1" />
                                <div className="flex-1">
                                    <h4 className="text-gray-900 dark:text-white font-medium mb-2">Process a Google Sheet</h4>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                                        Paste your Google Sheet link. We detect section headings and parse the problems
                                        beneath them into a DSA tracker. Your title, description, price and cover stay
                                        exactly as you entered them.
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            placeholder="https://docs.google.com/spreadsheets/d/..."
                                            value={sheetUrl}
                                            onChange={(e) => { setSheetUrl(e.target.value); setSheetPreview(null); }}
                                        />
                                        <button
                                            onClick={handleProcessSheet}
                                            disabled={processingSheet || !sheetUrl}
                                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                                        >
                                            {processingSheet ? 'Processing...' : 'Process Sheet'}
                                        </button>
                                    </div>
                                    <div className="mt-3 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                        <span>
                                            The sheet must be viewable — set link sharing to{' '}
                                            <strong>Anyone with the link → Viewer</strong>, or share it with the service account.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Parsed results */}
                        {sheetPreview && (
                            <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold text-gray-900 dark:text-white">Parsed Results</h4>
                                    <div className="flex gap-2">
                                        <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                                            {sheetPreview.stats.sectionCount} sections
                                        </span>
                                        <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                                            {sheetPreview.stats.problemCount} problems
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                                    {sheetPreview.sections.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/40">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{s.title}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">{s.problemCount}</span>
                                        </div>
                                    ))}
                                </div>
                                {sheetPreview.warnings.length > 0 && (
                                    <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3.5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                                {sheetPreview.warnings.length} warning{sheetPreview.warnings.length === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                        <ul className="list-disc list-inside space-y-1 text-xs text-amber-700 dark:text-amber-300/90 max-h-32 overflow-y-auto">
                                            {sheetPreview.warnings.slice(0, 15).map((w, i) => <li key={i}>{w}</li>)}
                                        </ul>
                                    </div>
                                )}
                                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                    Looks good? Click <strong>Save &amp; Continue to Preview</strong> below to create the course, then Publish.
                                </p>
                            </div>
                        )}
                    </div>
                    ) : (
                    <>
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Course Content</h3>

                        {/* Google Doc Link Option */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
                            <div className="flex items-start gap-4">
                                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                                <div className="flex-1">
                                    <h4 className="text-gray-900 dark:text-white font-medium mb-2">Import from Google Doc</h4>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                                        Paste a Google Doc link. We extract sections, content, YouTube videos, and assignments into the editor below.
                                        Images pasted directly into the document are uploaded automatically and appear inline at the exact position you placed them.
                                        Your course title, description, price and other details stay exactly as you entered them.
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            placeholder="https://docs.google.com/document/d/..."
                                            value={docLink}
                                            onChange={(e) => setDocLink(e.target.value)}
                                        />
                                        <button
                                            onClick={handleProcessDoc}
                                            disabled={isSaving || !docLink}
                                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                                        >
                                            {isSaving ? 'Processing...' : 'Process Document'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-center text-gray-500 dark:text-gray-400 mb-6">or add sections manually</div>
                    </div>

                    {/* Manual Section Creation */}
                    <div className="space-y-6">
                        {sections.map((section, index) => (
                            <div key={section.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-gray-900 dark:text-white font-medium">Section {index + 1}</h4>
                                    <button
                                        type="button"
                                        onClick={() => deleteSection(section)}
                                        disabled={deletingId === section.id}
                                        className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Delete this section"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {deletingId === section.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Section Title</label>
                                        <input
                                            type="text"
                                            value={section.title}
                                            onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            placeholder="e.g., Introduction to Components"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Content</label>
                                        <textarea
                                            value={section.content}
                                            onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                                            rows={6}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            placeholder="Enter section content..."
                                        />
                                    </div>

                                    {/* Imported structured content summary (from Google Doc) */}
                                    {((section.youtube_videos?.length || 0) > 0 ||
                                      (section.assignments?.length || 0) > 0 ||
                                      (section.resources?.length || 0) > 0) && (
                                        <div className="flex flex-wrap gap-2">
                                            {(section.youtube_videos?.length || 0) > 0 && (
                                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                                    {section.youtube_videos.length} video{section.youtube_videos.length === 1 ? '' : 's'}
                                                </span>
                                            )}
                                            {(section.assignments?.length || 0) > 0 && (
                                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                                    {section.assignments.length} assignment{section.assignments.length === 1 ? '' : 's'}
                                                </span>
                                            )}
                                            {(section.resources?.length || 0) > 0 && (
                                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                                    {section.resources.length} resource{section.resources.length === 1 ? '' : 's'}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {(selectedTemplate === 'video-only' || selectedTemplate === 'text-video') && (
                                        <div>
                                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Video URL</label>
                                            <input
                                                type="url"
                                                value={section.videoUrl}
                                                onChange={(e) => updateSection(section.id, 'videoUrl', e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    )}

                                </div>
                            </div>
                        ))}

                        <button
                            onClick={addSection}
                            className="w-full py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 transition-colors"
                        >
                            + Add Section
                        </button>
                    </div>
                    </>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-8 flex gap-4">
                        <button
                            onClick={() => setStep('details')}
                            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSaveDraft}
                            disabled={isSaving || (isProblemSolving && !sheetPreview)}
                            className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save className="w-5 h-5" />
                            Save Draft
                        </button>
                        <button
                            onClick={handleSaveAndPreview}
                            disabled={isSaving || (isProblemSolving && !sheetPreview)}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg flex-1 justify-center transition-colors disabled:cursor-not-allowed"
                        >
                            <Eye className="w-5 h-5" />
                            {isSaving ? 'Saving...' : 'Save & Continue to Preview'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
