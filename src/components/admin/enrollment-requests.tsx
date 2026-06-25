"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Search, Check, X, Clock, CheckCircle, XCircle, Eye,
    ShieldCheck, Layers, Sparkles, Inbox,
} from "lucide-react";
import toast from "react-hot-toast";
import { enrollmentRequestService } from "@/services/api/enrollment-request.api";
import { EnrollmentRequest, ApprovalStatus } from "@/types/enrollment-request";

const TABS: { id: ApprovalStatus; label: string; icon: any }[] = [
    { id: "PENDING", label: "Pending", icon: Clock },
    { id: "APPROVED", label: "Approved", icon: CheckCircle },
    { id: "REJECTED", label: "Rejected", icon: XCircle },
];

export function EnrollmentRequests() {
    const router = useRouter();
    const [tab, setTab] = useState<ApprovalStatus>("PENDING");
    const [rows, setRows] = useState<EnrollmentRequest[]>([]);
    const [counts, setCounts] = useState({ PENDING: 0, APPROVED: 0, REJECTED: 0 });
    const [meta, setMeta] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rejectFor, setRejectFor] = useState<EnrollmentRequest | null>(null);
    const [detail, setDetail] = useState<EnrollmentRequest | null>(null);

    const load = useCallback(async (status: ApprovalStatus, p: number, q: string) => {
        try {
            setLoading(true);
            setError(null);
            const { rows, meta, counts } = await enrollmentRequestService.listAdmin({ status, q: q || undefined, page: p, limit: 10 });
            setRows(rows);
            setMeta(meta);
            setCounts(counts);
        } catch (e: any) {
            setError(e?.message || "Failed to load requests");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(tab, page, appliedSearch); }, [tab, page, appliedSearch, load]);

    const onSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setAppliedSearch(search.trim()); };
    const switchTab = (t: ApprovalStatus) => { setTab(t); setPage(1); };

    const approve = async (req: EnrollmentRequest) => {
        setBusyId(req.id);
        // optimistic: remove from the pending list
        setRows((prev) => prev.filter((r) => r.id !== req.id));
        setCounts((c) => ({ ...c, PENDING: Math.max(0, c.PENDING - 1), APPROVED: c.APPROVED + 1 }));
        try {
            await enrollmentRequestService.approve(req.id);
            toast.success(`Approved — ${req.student_name} now has access to ${req.product_name}`);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e.message || "Failed to approve");
            load(tab, page, appliedSearch); // resync on failure
        } finally {
            setBusyId(null);
        }
    };

    const doReject = async (notes: string) => {
        if (!rejectFor) return;
        const req = rejectFor;
        setRejectFor(null);
        setBusyId(req.id);
        setRows((prev) => prev.filter((r) => r.id !== req.id));
        setCounts((c) => ({ ...c, PENDING: Math.max(0, c.PENDING - 1), REJECTED: c.REJECTED + 1 }));
        try {
            await enrollmentRequestService.reject(req.id, notes);
            toast.success("Request rejected");
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e.message || "Failed to reject");
            load(tab, page, appliedSearch);
        } finally {
            setBusyId(null);
        }
    };

    const productIcon = (t: string) => (t === "ALL_IN_ONE" ? <Sparkles className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />);
    const fmt = (d?: string) => (d ? new Date(d).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button onClick={() => router.push("/admin")} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors">
                <ArrowLeft className="w-5 h-5" /> Back to Dashboard
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-blue-600" /> Enrollment Requests
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Review offline-payment access requests</p>
                </div>
                <form onSubmit={onSearch} className="relative">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search student or product…"
                        className="w-64 pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </form>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 mb-6">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => switchTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            tab === t.id ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                        <t.icon className="w-4 h-4" /> {t.label}
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">{counts[t.id]}</span>
                    </button>
                ))}
            </div>

            {/* Body */}
            {loading ? (
                <div className="space-y-2">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />)}
                </div>
            ) : error ? (
                <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900/40">
                    <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                    <button onClick={() => load(tab, page, appliedSearch)} className="mt-3 text-sm text-blue-600 hover:underline">Retry</button>
                </div>
            ) : rows.length === 0 ? (
                <div className="p-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <Inbox className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                    <p className="font-medium text-gray-700 dark:text-gray-300">No {tab.toLowerCase()} requests</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    {["Student", "Product", "Requested", "Status", ""].map((h, i) => (
                                        <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {rows.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                                                    {(r.student_name || "?").charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.student_name}</p>
                                                    <p className="text-xs text-gray-400 truncate">{r.student_email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                                                {productIcon(r.product_type)} {r.product_name}
                                            </span>
                                            <span className="block text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">{r.product_type.replace("_", "-")}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{fmt(r.created_at)}</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={r.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button onClick={() => setDetail(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" title="View details">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {r.status === "PENDING" && (
                                                    <>
                                                        <button
                                                            onClick={() => approve(r)}
                                                            disabled={busyId === r.id}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                                                        >
                                                            <Check className="w-3.5 h-3.5" /> Approve
                                                        </button>
                                                        <button
                                                            onClick={() => setRejectFor(r)}
                                                            disabled={busyId === r.id}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                                                        >
                                                            <X className="w-3.5 h-3.5" /> Reject
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {meta && meta.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                            <span className="text-xs text-gray-500">Page {meta.page} of {meta.totalPages} · {meta.total} total</span>
                            <div className="flex gap-2">
                                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.page === 1} className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">Previous</button>
                                <button onClick={() => setPage((p) => p + 1)} disabled={meta.page >= meta.totalPages} className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {rejectFor && <RejectModal req={rejectFor} onCancel={() => setRejectFor(null)} onConfirm={doReject} />}
            {detail && <DetailModal req={detail} onClose={() => setDetail(null)} />}
        </div>
    );
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
    const map = {
        PENDING: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
        APPROVED: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
        REJECTED: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    };
    return <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${map[status]}`}>{status}</span>;
}

function RejectModal({ req, onCancel, onConfirm }: { req: EnrollmentRequest; onCancel: () => void; onConfirm: (notes: string) => void }) {
    const [notes, setNotes] = useState("");
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md p-5">
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Reject request</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{req.student_name} · {req.product_name}</p>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Reason for rejection (visible to the student)…"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none"
                />
                <div className="flex gap-3 mt-4">
                    <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium">Cancel</button>
                    <button onClick={() => onConfirm(notes.trim())} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold">Reject Request</button>
                </div>
            </div>
        </div>
    );
}

function DetailModal({ req, onClose }: { req: EnrollmentRequest; onClose: () => void }) {
    const row = (label: string, value?: string) => (
        <div className="flex justify-between gap-4 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
            <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white text-right">{value || "—"}</span>
        </div>
    );
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-gray-900 dark:text-white">Request Details</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5">
                    {row("Student", req.student_name)}
                    {row("Email", req.student_email)}
                    {row("Product", req.product_name)}
                    {row("Type", req.product_type.replace("_", "-"))}
                    {row("Status", req.status)}
                    {row("Requested", new Date(req.created_at).toLocaleString())}
                    {req.reviewed_at && row("Reviewed", new Date(req.reviewed_at).toLocaleString())}
                    {req.notes && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Student note</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{req.notes}</p>
                        </div>
                    )}
                    {req.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                            <p className="text-[10px] uppercase tracking-wide text-red-400 mb-1">Rejection reason</p>
                            <p className="text-sm text-red-700 dark:text-red-300">{req.rejection_reason}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
