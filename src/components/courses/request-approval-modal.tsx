"use client";

import { useState } from 'react';
import { KeyRound, Info, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/modal';
import { accessRequestApi, apiErrorMessage } from '@/services/api/enrollment-management.api';
import type { ResourceType } from '@/types/enrollment';

const KIND: Record<ResourceType, string> = { COURSE: 'course', BUNDLE: 'bundle', ALL_IN_ONE: 'Master Subscription' };

interface RequestAccessModalProps {
    productType: ResourceType;
    productId: string;
    productName: string;
    onClose: () => void;
    onSubmitted: () => void;
}

/** Student asks an admin for access to a course, bundle or the Master Subscription. */
export function RequestAccessModal({ productType, productId, productName, onClose, onSubmitted }: RequestAccessModalProps) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        if (submitting) return; // guard double-click
        setSubmitting(true);
        try {
            await accessRequestApi.create({ resourceType: productType, resourceId: productType === 'ALL_IN_ONE' ? undefined : productId, reason: reason.trim() || undefined });
            toast.success('Request sent. You’ll be notified when an admin reviews it.');
            onSubmitted();
            onClose();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Failed to submit request'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open
            onClose={submitting ? () => undefined : onClose}
            title="Request access"
            icon={<KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            footer={
                <div className="flex gap-3">
                    <button type="button" onClick={onClose} disabled={submitting} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium">Cancel</button>
                    <button type="button" onClick={submit} disabled={submitting} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />} {submitting ? 'Submitting…' : 'Submit request'}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        Requesting the {KIND[productType]} <span className="font-bold">{productName}</span>. An admin will review it; you can track it under <span className="font-semibold">Access Requests</span>.
                    </p>
                </div>
                <label className="block">
                    <span className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                        Reason <span className="font-normal text-gray-400">(optional — e.g. paid offline, scholarship, payment reference)</span>
                    </span>
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={3}
                        maxLength={1000}
                        placeholder="Paid ₹… via UPI on 22 Jun, ref #…"
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                </label>
            </div>
        </Modal>
    );
}
