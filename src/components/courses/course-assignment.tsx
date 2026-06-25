
"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { courseService } from '@/services/api/course.api';
import { batchService } from '@/services/api/batch.api';
import { studentService } from '@/services/api/student.api';
import { Course } from '@/types/course';
import { Batch } from '@/types/batch';
import { Student } from '@/types/student';

export function CourseAssignment() {
    const router = useRouter();
    const [step, setStep] = useState<'course' | 'target' | 'confirm'>('course');
    const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
    const [assignmentType, setAssignmentType] = useState<'batch' | 'individual'>('batch');
    const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const [courses, setCourses] = useState<Course[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [coursesResult, batchesResult, studentsResult] = await Promise.all([
                    courseService.getAll({ limit: 100 }),
                    batchService.getAll(1, 100),
                    studentService.getAll(1, 1000)
                ]);
                setCourses(coursesResult.data);
                setBatches(batchesResult.data);
                setStudents(studentsResult.data);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCourseSelect = (courseId: string) => {
        setSelectedCourse(courseId);
        setStep('target');
    };

    const toggleTargetSelection = (targetId: string) => {
        setSelectedTargets(prev =>
            prev.includes(targetId)
                ? prev.filter(id => id !== targetId)
                : [...prev, targetId]
        );
    };

    const handleAssign = async () => {
        if (!selectedCourse) return;
        setIsAssigning(true);

        try {
            const payload: any = {
                assignmentType
            };

            if (assignmentType === 'individual') {
                payload.studentIds = selectedTargets;
            } else {
                payload.batchIds = selectedTargets;
            }

            await courseService.assign(selectedCourse, payload);

            setIsAssigning(false);
            setShowSuccess(true);

            setTimeout(() => {
                router.push('/admin');
            }, 2000);
        } catch (error) {
            console.error('Failed to assign course:', error);
            toast.error('Failed to assign course. Please try again.');
            setIsAssigning(false);
        }
    };

    const targets = assignmentType === 'batch' ? batches : students;
    const filteredTargets = targets.filter((t: any) =>
        (t.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (showSuccess) {
        return (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
                    <div className="inline-block p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Course Assigned Successfully!</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        {courses.find(c => c.id === selectedCourse)?.title} has been assigned to{' '}
                        {selectedTargets.length} {assignmentType === 'batch' ? 'batch(es)' : 'student(s)'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <button
                    onClick={() => router.push('/admin')}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Dashboard
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Assign Course</h2>
                <p className="text-gray-600 dark:text-gray-400">Assign courses to students or batches</p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
                <div className="flex items-center justify-center gap-4">
                    {['Select Course', 'Choose Target', 'Confirm'].map((label, index) => (
                        <div key={label} className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${(step === 'course' && index === 0) ||
                                    (step === 'target' && index === 1) ||
                                    (step === 'confirm' && index === 2)
                                    ? 'bg-blue-600 text-white'
                                    : index < ['course', 'target', 'confirm'].indexOf(step)
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                    }`}>
                                    {index + 1}
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                            </div>
                            {index < 2 && <div className="w-12 h-0.5 bg-gray-300 dark:bg-gray-700" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step 1: Select Course */}
            {step === 'course' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select a Course</h3>
                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">Loading courses...</div>
                        ) : courses.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">No courses available.</div>
                        ) : (
                            courses.map((course) => (
                                <button
                                    key={course.id}
                                    onClick={() => handleCourseSelect(course.id!)}
                                    className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-600 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-gray-900 dark:text-white font-medium mb-1">{course.title}</h4>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm">{course.category}</p>
                                        </div>
                                        <div className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">→</div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Step 2: Choose Target */}
            {step === 'target' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Assign &ldquo;<span className="text-blue-600 dark:text-blue-400">{courses.find(c => c.id === selectedCourse)?.title}</span>&rdquo;
                        </h3>

                        {/* Assignment Type Toggle */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => {
                                    setAssignmentType('batch');
                                    setSelectedTargets([]);
                                }}
                                className={`flex-1 py-2 px-4 rounded-lg transition-colors text-sm font-medium ${assignmentType === 'batch'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                Assign to Batch
                            </button>
                            <button
                                onClick={() => {
                                    setAssignmentType('individual');
                                    setSelectedTargets([]);
                                }}
                                className={`flex-1 py-2 px-4 rounded-lg transition-colors text-sm font-medium ${assignmentType === 'individual'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                Assign to Individual
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder={`Search ${assignmentType === 'batch' ? 'batches' : 'students'}...`}
                            />
                        </div>
                    </div>

                    {/* Target Selection */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto mb-6">
                        {filteredTargets.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">No {assignmentType === 'batch' ? 'batches' : 'students'} found.</div>
                        ) : (
                            filteredTargets.map((target: any) => (
                                <label
                                    key={target.id}
                                    className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedTargets.includes(target.id)}
                                        onChange={() => toggleTargetSelection(target.id)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <p className="text-gray-900 dark:text-white text-sm font-medium">{target.name}</p>
                                        {assignmentType === 'batch' ? (
                                            <p className="text-gray-500 dark:text-gray-400 text-xs">{target.students} students</p>
                                        ) : (
                                            <p className="text-gray-500 dark:text-gray-400 text-xs">{target.email}</p>
                                        )}
                                    </div>
                                </label>
                            ))
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setStep('course')}
                            className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => setStep('confirm')}
                            disabled={selectedTargets.length === 0}
                            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                        >
                            Next: Confirm
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Confirm */}
            {step === 'confirm' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Confirm Assignment</h3>

                    <div className="space-y-4 mb-6">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Course</p>
                            <p className="text-gray-900 dark:text-white font-medium">
                                {courses.find(c => c.id === selectedCourse)?.title}
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Will be assigned to {selectedTargets.length} {assignmentType === 'batch' ? 'batch(es)' : 'student(s)'}:
                            </p>
                            <ul className="space-y-1 max-h-40 overflow-y-auto">
                                {selectedTargets.map(id => {
                                    const target = targets.find((t: any) => t.id === id);
                                    return (
                                        <li key={id} className="text-gray-900 dark:text-white text-sm">
                                            • {(target as any)?.name}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {assignmentType === 'batch' && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    Total students affected: {selectedTargets.reduce((sum, id) => {
                                        const batch = batches.find(b => b.id === id);
                                        return sum + (batch?.students || 0);
                                    }, 0)}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setStep('target')}
                            className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleAssign}
                            disabled={isAssigning}
                            className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
                        >
                            {isAssigning ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Assigning...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Confirm & Assign
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
