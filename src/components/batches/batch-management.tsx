
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, Plus, Users, Search, Edit, Trash2, Video, BarChart3,
    Calendar, UserCheck, ChevronRight, TrendingUp, Layers, UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { batchService } from '@/services/api/batch.api';
import { studentService } from '@/services/api/student.api';
import { Batch } from '@/types/batch';
import { Student } from '@/types/student';

export function BatchManagement() {
    const router = useRouter();
    const [view, setView] = useState<'list' | 'create' | 'assign'>('list');
    const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
    const [newBatchName, setNewBatchName] = useState('');
    const [newBatchStartDate, setNewBatchStartDate] = useState('');
    const [batchSearchQuery, setBatchSearchQuery] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

    const [batches, setBatches] = useState<Batch[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const searchParams = useSearchParams();
    const editUrlParam = searchParams.get('edit');
    const [editId, setEditId] = useState<string | null>(null);

    useEffect(() => {
        if (editUrlParam) {
            const batchToEdit = batches.find(b => b.id === editUrlParam);
            if (batchToEdit) {
                setEditId(editUrlParam);
                setNewBatchName(batchToEdit.name);
                setNewBatchStartDate(batchToEdit.startDate ? new Date(batchToEdit.startDate).toISOString().split('T')[0] : '');
                setView('create');
            }
        }
    }, [editUrlParam, batches]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [batchesResult, studentsResult] = await Promise.all([
                batchService.getAll(1, 100, batchSearchQuery), // Increased limit for management view
                studentService.getAll(1, 1000) // Increased limit to allow searching for students to assign
            ]);
            setBatches(batchesResult.data);
            setStudents(studentsResult.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            if (editId) {
                await batchService.update(editId, {
                    name: newBatchName,
                    startDate: newBatchStartDate
                });
                toast.success(`Batch "${newBatchName}" updated successfully`);
            } else {
                await batchService.create({
                    name: newBatchName,
                    startDate: newBatchStartDate
                });
                toast.success(`Batch "${newBatchName}" created successfully`);
            }
            setNewBatchName('');
            setNewBatchStartDate('');
            setEditId(null);
            if (editUrlParam) {
                router.push('/admin/batches');
            }
            setView('list');
            fetchData(); // Refresh list
        } catch (error) {
            console.error('Failed to save batch:', error);
            toast.error('Failed to save batch. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteBatch = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete the batch "${name}"?`)) {
            try {
                await batchService.delete(id);
                toast.success('Batch deleted successfully');
                fetchData();
            } catch (error) {
                console.error('Failed to delete batch:', error);
                toast.error('Failed to delete batch');
            }
        }
    };

    const handleEditClick = (batch: Batch) => {
        setEditId(batch.id);
        setNewBatchName(batch.name);
        setNewBatchStartDate(batch.startDate ? new Date(batch.startDate).toISOString().split('T')[0] : '');
        setView('create');
    };

    const handleAssignStudents = async () => {
        if (!selectedBatch) return;
        try {
            setIsSubmitting(true);
            await batchService.assignStudents(selectedBatch, selectedStudents);
            toast.success(`${selectedStudents.length} student(s) assigned to batch`);
            setSelectedStudents([]);
            setView('list');
            fetchData(); // Refresh counts
        } catch (error) {
            console.error('Failed to assign students:', error);
            toast.error('Failed to assign students. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleStudentSelection = (studentId: string) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <button
                    onClick={() => router.push('/admin')}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Dashboard
                </button>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Batch Management</h2>
                        <p className="text-gray-600 dark:text-gray-400">Create and manage student batches</p>
                    </div>
                    {view === 'list' && (
                        <div className="flex gap-4">
                            <form 
                                onSubmit={(e) => { e.preventDefault(); fetchData(); }} 
                                className="relative hidden sm:block"
                            >
                                <input
                                    type="text"
                                    placeholder="Search batches..."
                                    value={batchSearchQuery}
                                    onChange={(e) => setBatchSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-64"
                                />
                                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            </form>
                            <button
                                onClick={() => setView('create')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Create Batch
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* List View */}
            {view === 'list' && (
                loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-56 bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse" />
                        ))}
                    </div>
                ) : batches.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                        <Layers className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                        <p className="font-medium text-gray-700 dark:text-gray-300">No batches yet</p>
                        <p className="text-sm text-gray-400 mt-1">Create your first batch to start organising students.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {batches.map((batch) => (
                            <div
                                key={batch.id}
                                className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all overflow-hidden"
                            >
                                {/* Card header */}
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <button
                                            onClick={() => router.push(`/admin/batches/${batch.id}`)}
                                            className="text-left min-w-0 flex-1"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {batch.name}
                                                </h3>
                                                <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                                    batch.status === 'archived'
                                                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                                                        : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                                }`}>
                                                    {batch.status || 'active'}
                                                </span>
                                            </div>
                                            {batch.description ? (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{batch.description}</p>
                                            ) : (
                                                <p className="text-xs text-gray-400 dark:text-gray-500">{batch.batch_number || batch.id}</p>
                                            )}
                                        </button>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => handleEditClick(batch)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Edit batch">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteBatch(batch.id, batch.name)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete batch">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {batch.startDate ? new Date(batch.startDate).toLocaleDateString() : 'No start date'}
                                            {batch.endDate ? ` – ${new Date(batch.endDate).toLocaleDateString()}` : ''}
                                        </span>
                                    </div>

                                    {/* Stat tiles */}
                                    <div className="grid grid-cols-3 gap-2 mt-4">
                                        <StatTile icon={<Users className="w-4 h-4 text-blue-500" />} value={batch.students} label="Students" />
                                        <StatTile icon={<UserCheck className="w-4 h-4 text-green-500" />} value={batch.activeStudents ?? 0} label="Active" />
                                        <StatTile icon={<Video className="w-4 h-4 text-indigo-500" />} value={batch.meetingsScheduled ?? 0} label="Meetings" />
                                    </div>

                                    {/* Progress overview */}
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <TrendingUp className="w-3.5 h-3.5" /> Avg progress
                                            </span>
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">{batch.progress || 0}%</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${batch.progress || 0}%` }} />
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-1.5">
                                            {batch.completionRate ?? 0}% completion rate
                                            {batch.recurringMeetings ? ` · ${batch.recurringMeetings} recurring` : ''}
                                        </p>
                                    </div>
                                </div>

                                {/* Quick actions */}
                                <div className="flex items-center divide-x divide-gray-100 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-700">
                                    <QuickAction icon={<Users className="w-4 h-4" />} label="Students" onClick={() => router.push(`/admin/batches/${batch.id}?tab=students`)} />
                                    <QuickAction icon={<Video className="w-4 h-4" />} label="Meetings" onClick={() => router.push(`/admin/batches/${batch.id}?tab=meetings`)} />
                                    <QuickAction icon={<BarChart3 className="w-4 h-4" />} label="Analytics" onClick={() => router.push(`/admin/batches/${batch.id}?tab=analytics`)} />
                                    <QuickAction icon={<UserPlus className="w-4 h-4" />} label="Assign" onClick={() => { setSelectedBatch(batch.id); setView('assign'); }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Create/Edit Batch View */}
            {view === 'create' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                        {editId ? 'Edit Batch' : 'Create New Batch'}
                    </h3>
                    <form onSubmit={handleCreateBatch} className="space-y-6">
                        <div>
                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Batch Name</label>
                            <input
                                type="text"
                                value={newBatchName}
                                onChange={(e) => setNewBatchName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="e.g., Web Development Q2 2025"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                            <input
                                type="date"
                                value={newBatchStartDate}
                                onChange={(e) => setNewBatchStartDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                required
                            />
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                                After creating the batch, you can assign students to it from the batch list.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setNewBatchName('');
                                    setNewBatchStartDate('');
                                    setEditId(null);
                                    if (editUrlParam) {
                                        router.push('/admin/batches');
                                    }
                                    setView('list');
                                }}
                                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-70"
                            >
                                {isSubmitting ? 'Saving...' : editId ? 'Update Batch' : 'Create Batch'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Assign Students View */}
            {view === 'assign' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Assign Students to Batch</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Selected Batch: <span className="font-medium text-gray-900 dark:text-white">{batches.find(b => b.id === selectedBatch)?.name}</span>
                        </p>
                    </div>

                    {/* Search */}
                    <div className="mb-6">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="Search students..."
                            />
                        </div>
                    </div>

                    {/* Student Selection */}
                    <div className="mb-6">
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
                            {filteredStudents.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 dark:text-gray-400">No students found matching your search.</div>
                            ) : (
                                filteredStudents.map((student) => (
                                    <label
                                        key={student.id}
                                        className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.includes(student.id)}
                                            onChange={() => toggleStudentSelection(student.id)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                            <p className="text-gray-900 dark:text-white text-sm font-medium">{student.name}</p>
                                            <p className="text-gray-500 dark:text-gray-400 text-xs">{student.email}</p>
                                        </div>
                                        {student.batch && (
                                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                                                Current: {student.batch}
                                            </span>
                                        )}
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                        <p className="text-gray-700 dark:text-gray-300 text-sm">
                            {selectedStudents.length} student(s) selected for assignment
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => {
                                setView('list');
                                setSelectedStudents([]);
                            }}
                            className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAssignStudents}
                            disabled={selectedStudents.length === 0 || isSubmitting}
                            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Assigning...' : `Assign ${selectedStudents.length} Student(s)`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
    return (
        <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2.5 text-center">
            <div className="flex justify-center mb-1">{icon}</div>
            <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{value}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">{label}</p>
        </div>
    );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
            {icon}
            <span className="text-[11px] font-medium">{label}</span>
        </button>
    );
}
