"use client";

import { useState } from 'react';
import { X, ShieldCheck, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { enrollmentRequestService } from '@/services/api/enrollment-request.api';
import { ProductType } from '@/types/enrollment-request';

interface RequestApprovalModalProps {
    productType: ProductType;
    productId: string;
    productName: string;
    onClose: () => void;
    onSubmitted: () => void;
}

export function RequestApprovalModal({ productType, productId, productName, onClose, onSubmitted }: RequestApprovalModalProps) {
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        if (submitting) return; // guard double-click
        setSubmitting(true);
        try {
            await enrollmentRequestService.create({ productType, productId, notes: notes.trim() || undefined });
            toast.success('Request submitted successfully.');
            onSubmitted();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md">
                <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Request Admin Approval</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-5 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        You can request course access if you have already paid offline
                        (cash, bank transfer, direct payment, etc.).
                    </p>

                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            Requesting access to <span className="font-bold">{productName}</span>. An admin will review and approve it.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                            Note for admin <span className="font-normal text-gray-400">(optional — e.g. payment reference)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Paid ₹… via UPI on 22 Jun, ref #…"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
                        Cancel
                    </button>
                    <button onClick={submit} disabled={submitting} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-60">
                        {submitting ? 'Submitting…' : 'Submit Request'}
                    </button>
                </div>
            </div>
        </div>
    );
}
