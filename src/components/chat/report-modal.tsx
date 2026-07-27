"use client";

import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatService } from '@/services/api/chat.api';

interface ReportModalProps {
    target: {
        type: 'message' | 'user';
        messageId?: string;
        userId: string;
        conversationId?: string;
    };
    onClose: () => void;
}

const REASONS = [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'other', label: 'Other' },
] as const;

/**
 * Report a message or user. Collects a reason + optional details and submits to
 * the moderation endpoint.
 */
export function ReportModal({ target, onClose }: ReportModalProps) {
    const [reason, setReason] = useState<string>('spam');
    const [details, setDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            await chatService.report({
                target_type: target.type,
                message_id: target.messageId,
                user_id: target.userId,
                conversation_id: target.conversationId,
                reason,
                details: details.trim() || undefined,
            });
            toast.success('Report submitted');
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to submit report');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                            <Flag className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white">
                            Report {target.type === 'message' ? 'message' : 'user'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Tell us what&apos;s wrong. Our team will review this report.
                    </p>

                    <div className="space-y-2">
                        {REASONS.map((r) => (
                            <label
                                key={r.value}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                                    reason === r.value
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="report-reason"
                                    value={r.value}
                                    checked={reason === r.value}
                                    onChange={() => setReason(r.value)}
                                    className="accent-blue-600"
                                />
                                <span className="text-sm text-gray-900 dark:text-white">{r.label}</span>
                            </label>
                        ))}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                            Additional details <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            rows={3}
                            placeholder="Add any context that will help us review…"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
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
                        onClick={submit}
                        disabled={submitting}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-60"
                    >
                        {submitting ? 'Submitting…' : 'Submit report'}
                    </button>
                </div>
            </div>
        </div>
    );
}
