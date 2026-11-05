'use client';

import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { ContentDensity, OrganizationStrategy, StructureOptions } from '@/types/structured-course';

export const MAX_TARGET_MODULES = 50;
export const MAX_TARGET_LESSONS = 300;
export const MAX_INSTRUCTIONS_CHARS = 1500;

const DENSITIES: { value: ContentDensity; label: string; help: string }[] = [
    { value: 'compact', label: 'Compact', help: 'Combine related topics into fewer, comprehensive lessons.' },
    { value: 'balanced', label: 'Balanced', help: 'Balance lesson length and topic separation.' },
    { value: 'detailed', label: 'Detailed', help: 'Separate complex topics into more focused lessons.' },
];

const STRATEGIES: { value: OrganizationStrategy; label: string; help: string }[] = [
    { value: 'headings', label: 'Follow Document Headings', help: 'Use the document’s heading hierarchy as the main structure.' },
    { value: 'concept', label: 'Concept-Based', help: 'Group related concepts together.' },
    { value: 'learning_path', label: 'Learning Path', help: 'Organize as a beginner-to-advanced sequence.' },
];

export const DEFAULT_OPTIONS: StructureOptions = { targetModules: null, targetLessons: null, density: 'balanced', strategy: 'headings', instructions: '' };

interface Fields { modules: string; lessons: string; density: ContentDensity; strategy: OrganizationStrategy; instructions: string }

const toFields = (o: StructureOptions): Fields => ({
    modules: o.targetModules?.toString() ?? '',
    lessons: o.targetLessons?.toString() ?? '',
    density: o.density,
    strategy: o.strategy,
    instructions: o.instructions,
});

function parseCount(raw: string, label: string, max: number): { value: number | null; error?: string } {
    const text = raw.trim();
    if (!text) return { value: null };
    if (!/^\d+$/.test(text)) return { value: null, error: `${label} must be a whole number.` };
    const value = Number(text);
    if (value < 1 || value > max) return { value: null, error: `${label} must be between 1 and ${max}.` };
    return { value };
}

/** Validate the form the way the server will; null options means there is something to fix. */
export function validateOptions(fields: Fields): { options: StructureOptions | null; errors: { modules?: string; lessons?: string; instructions?: string } } {
    const modules = parseCount(fields.modules, 'Target modules', MAX_TARGET_MODULES);
    const lessons = parseCount(fields.lessons, 'Target lessons', MAX_TARGET_LESSONS);
    const errors: { modules?: string; lessons?: string; instructions?: string } = {};
    if (modules.error) errors.modules = modules.error;
    if (lessons.error) errors.lessons = lessons.error;
    if (!errors.modules && !errors.lessons && modules.value !== null && lessons.value !== null && lessons.value < modules.value) {
        errors.lessons = 'Target lessons cannot be fewer than target modules.';
    }
    if (fields.instructions.length > MAX_INSTRUCTIONS_CHARS) errors.instructions = `Keep instructions under ${MAX_INSTRUCTIONS_CHARS} characters.`;
    if (Object.keys(errors).length) return { options: null, errors };
    return {
        options: { targetModules: modules.value, targetLessons: lessons.value, density: fields.density, strategy: fields.strategy, instructions: fields.instructions.trim() },
        errors,
    };
}

interface CustomizeCurriculumFormProps {
    /** Last settings used, so a refresh does not lose them. */
    initial?: StructureOptions | null;
    /** A run is in flight (this one or another): duplicate submissions are blocked. */
    busy: boolean;
    /** Why customizing is not possible right now (e.g. the original document is not stored yet). */
    unavailableReason?: string | null;
    onSubmit: (options: StructureOptions) => void;
}

const inputClass = (invalid: boolean) =>
    `w-full px-3 py-2 border dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:border-transparent outline-none disabled:opacity-60 ${
        invalid ? 'border-red-400 focus:ring-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
    }`;

/**
 * "Customize Curriculum Structure": the administrator's targets and preferences.
 * Submitting rebuilds the curriculum from the original document; the result is
 * a draft to review, never a silent replacement.
 */
export function CustomizeCurriculumForm({ initial, busy, unavailableReason, onSubmit }: CustomizeCurriculumFormProps) {
    const [fields, setFields] = useState<Fields>(() => toFields(initial ?? DEFAULT_OPTIONS));
    const [touched, setTouched] = useState(false);
    const { options, errors } = validateOptions(fields);
    const set = <K extends keyof Fields>(key: K, value: Fields[K]) => setFields((f) => ({ ...f, [key]: value }));
    const disabled = busy || !!unavailableReason;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (options && !disabled) onSubmit(options);
    };

    // Errors appear once the admin has typed something or tried to submit, not on an untouched form.
    const show = (key: 'modules' | 'lessons' | 'instructions') => (touched || fields[key].length > 0 ? errors[key] : undefined);

    return (
        <form onSubmit={submit} aria-labelledby="customize-curriculum-title" className="mt-5 rounded-lg border border-blue-100 dark:border-blue-900 bg-white dark:bg-gray-800 p-4">
            <h5 id="customize-curriculum-title" className="text-sm font-semibold text-gray-900 dark:text-white">Customize Curriculum Structure</h5>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The AI rebuilds the curriculum from your original document — never from its earlier output — so no content is lost by repeating this.
                You review the result before anything changes for students.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="target-modules" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Target number of modules</label>
                    <input id="target-modules" inputMode="numeric" placeholder="Let the AI decide, e.g. 5" disabled={disabled}
                        aria-invalid={!!show('modules')} aria-describedby="target-modules-error"
                        className={inputClass(!!show('modules'))} value={fields.modules} onChange={(e) => set('modules', e.target.value)} />
                    <p id="target-modules-error" className="mt-1 text-xs text-red-600 dark:text-red-400">{show('modules')}</p>
                </div>
                <div>
                    <label htmlFor="target-lessons" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Target number of lessons (total)</label>
                    <input id="target-lessons" inputMode="numeric" placeholder="Let the AI decide, e.g. 20" disabled={disabled}
                        aria-invalid={!!show('lessons')} aria-describedby="target-lessons-error"
                        className={inputClass(!!show('lessons'))} value={fields.lessons} onChange={(e) => set('lessons', e.target.value)} />
                    <p id="target-lessons-error" className="mt-1 text-xs text-red-600 dark:text-red-400">{show('lessons')}</p>
                </div>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Lessons are counted across all modules, not per module. These are targets: if the document can’t support them without hurting quality, you get the closest structure and a reason.
            </p>

            <fieldset className="mt-4" disabled={disabled}>
                <legend className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Content density</legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {DENSITIES.map((d) => (
                        <label key={d.value} className={`cursor-pointer rounded-lg border p-2.5 text-xs ${fields.density === d.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600'}`}>
                            <input type="radio" name="density" className="sr-only" checked={fields.density === d.value} onChange={() => set('density', d.value)} />
                            <span className="block font-semibold text-gray-900 dark:text-white">{d.label}</span>
                            <span className="block text-gray-500 dark:text-gray-400">{d.help}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <fieldset className="mt-4" disabled={disabled}>
                <legend className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Curriculum organization strategy</legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {STRATEGIES.map((s) => (
                        <label key={s.value} className={`cursor-pointer rounded-lg border p-2.5 text-xs ${fields.strategy === s.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600'}`}>
                            <input type="radio" name="strategy" className="sr-only" checked={fields.strategy === s.value} onChange={() => set('strategy', s.value)} />
                            <span className="block font-semibold text-gray-900 dark:text-white">{s.label}</span>
                            <span className="block text-gray-500 dark:text-gray-400">{s.help}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <div className="mt-4">
                <label htmlFor="structure-instructions" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Additional instructions (optional)</label>
                <textarea id="structure-instructions" rows={3} disabled={disabled} aria-invalid={!!show('instructions')}
                    placeholder="e.g. Keep advanced topics in separate modules. Maintain the original topic sequence."
                    className={inputClass(!!show('instructions'))} value={fields.instructions} onChange={(e) => set('instructions', e.target.value)} />
                <div className="mt-1 flex justify-between text-xs">
                    <span className="text-red-600 dark:text-red-400">{show('instructions')}</span>
                    <span className="text-gray-400 tabular-nums">{fields.instructions.length}/{MAX_INSTRUCTIONS_CHARS}</span>
                </div>
            </div>

            {unavailableReason && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{unavailableReason}</p>}

            <div className="mt-4" aria-live="polite">
                <button type="submit" disabled={disabled || (touched && !options)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {busy ? 'Reprocessing…' : 'Reprocess Document with Custom Structure'}
                </button>
                {busy && (
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                        Rebuilding the curriculum from your original document. The current curriculum stays unchanged until you apply the result.
                    </p>
                )}
            </div>
        </form>
    );
}
