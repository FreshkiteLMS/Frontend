"use client";

import { useState } from 'react';
import { BarChart3, Loader2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatService } from '@/services/api/chat.api';

interface PollComposerModalProps {
    conversationId: string;
    onClose: () => void;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

export function PollComposerModal({ conversationId, onClose }: PollComposerModalProps) {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState<string[]>(['', '']);
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [closesAt, setClosesAt] = useState('');
    const [creating, setCreating] = useState(false);

    const setOption = (index: number, value: string) => {
        setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
    };

    const addOption = () => {
        setOptions((prev) => (prev.length >= MAX_OPTIONS ? prev : [...prev, '']));
    };

    const removeOption = (index: number) => {
        setOptions((prev) => (prev.length <= MIN_OPTIONS ? prev : prev.filter((_, i) => i !== index)));
    };

    const filledOptions = options.map((o) => o.trim()).filter(Boolean);
    const canCreate = question.trim().length > 0 && filledOptions.length >= MIN_OPTIONS;

    const create = async () => {
        if (creating) return;
        if (!canCreate) {
            toast.error('Add a question and at least 2 options');
            return;
        }
        setCreating(true);
        try {
            await chatService.createPoll(conversationId, {
                question: question.trim(),
                options: filledOptions,
                allow_multiple: allowMultiple,
                is_anonymous: isAnonymous,
                closes_at: closesAt ? new Date(closesAt).toISOString() : undefined,
            });
            toast.success('Poll created');
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to create poll');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Create poll</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Question</label>
                        <input
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            maxLength={200}
                            placeholder="What should we cover next session?"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Options</label>
                        <div className="space-y-2">
                            {options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        value={option}
                                        onChange={(e) => setOption(index, e.target.value)}
                                        maxLength={120}
                                        placeholder={`Option ${index + 1}`}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={() => removeOption(index)}
                                        disabled={options.length <= MIN_OPTIONS}
                                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                        aria-label={`Remove option ${index + 1}`}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {options.length < MAX_OPTIONS && (
                            <button
                                onClick={addOption}
                                className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1.5 rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add option
                            </button>
                        )}
                    </div>

                    <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Allow multiple answers</span>
                            <input
                                type="checkbox"
                                checked={allowMultiple}
                                onChange={(e) => setAllowMultiple(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
                            />
                        </label>
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Anonymous voting</span>
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
                            />
                        </label>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                                Closes at <span className="font-normal text-gray-400">(optional)</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={closesAt}
                                onChange={(e) => setClosesAt(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={create}
                        disabled={!canCreate || creating}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-60"
                    >
                        {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                        {creating ? 'Creating…' : 'Create poll'}
                    </button>
                </div>
            </div>
        </div>
    );
}
