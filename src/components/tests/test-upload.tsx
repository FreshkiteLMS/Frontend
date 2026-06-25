
"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { courseService } from '@/services/api/course.api';
import { testService } from '@/services/api/test.api';
import { Course } from '@/types/course';

export function TestModuleUpload() {
    const router = useRouter();
    const [selectedCourse, setSelectedCourse] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [testTitle, setTestTitle] = useState('');
    const [duration, setDuration] = useState(60);
    const [passingScore, setPassingScore] = useState(70);

    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadResult, setUploadResult] = useState<any>(null);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const data = await courseService.getAll();
                setCourses(data);
            } catch (error) {
                console.error('Failed to fetch courses', error);
            }
        };
        fetchCourses();
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            setUploadResult(null);
        }
    };

    const handleUpload = async () => {
        if (!uploadedFile || !selectedCourse || !testTitle) return;

        setIsProcessing(true);

        try {
            const newTest = await testService.createTest({
                courseId: selectedCourse,
                title: testTitle,
                duration: Number(duration),
                passingScore: Number(passingScore)
            });

            const result = await testService.uploadQuestions(newTest.id, uploadedFile);

            setUploadResult({
                success: true,
                questionsAdded: result.questionsAdded || result.totalQuestions,
                mcqQuestions: result.breakdown?.mcq || 0,
                textQuestions: result.breakdown?.text || 0,
                errors: (result.errors || []).length
            });

        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Failed to upload test module. Please check your file and try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadTemplate = () => {
        // In production, this would download an actual Excel template
        toast.success('Template download started');
    };

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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Upload Test Questions</h2>
                <p className="text-gray-600 dark:text-gray-400">Upload test questions via Excel file</p>
            </div>

            {!uploadResult ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                    {/* Course Selection */}
                    <div className="mb-6">
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Select Course</label>
                        <select
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                            <option value="">Choose a course...</option>
                            {courses.map((course) => (
                                <option key={course.id} value={course.id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Test Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Test Title</label>
                            <input
                                type="text"
                                value={testTitle}
                                onChange={(e) => setTestTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="e.g., Final Assessment"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Duration (minutes)</label>
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Passing Score (%)</label>
                            <input
                                type="number"
                                value={passingScore}
                                onChange={(e) => setPassingScore(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    {/* Template Download */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                        <div className="flex items-start gap-4">
                            <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                            <div className="flex-1">
                                <h4 className="text-gray-900 dark:text-white font-medium mb-2">Excel Template</h4>
                                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                                    Download our Excel template to ensure your questions are formatted correctly.
                                    The template supports both MCQ and text-based questions.
                                </p>
                                <button
                                    onClick={downloadTemplate}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Template
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* File Upload */}
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                        {uploadedFile ? (
                            <div className="space-y-4">
                                <FileSpreadsheet className="w-12 h-12 text-green-600 dark:text-green-500 mx-auto" />
                                <div>
                                    <p className="text-gray-900 dark:text-white font-medium mb-1">{uploadedFile.name}</p>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                                        {(uploadedFile.size / 1024).toFixed(2)} KB
                                    </p>
                                </div>
                                <button
                                    onClick={() => setUploadedFile(null)}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                                >
                                    Choose different file
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto" />
                                <div>
                                    <label className="cursor-pointer">
                                        <span className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                                            Click to upload
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-400"> or drag and drop</span>
                                        <input
                                            type="file"
                                            onChange={handleFileSelect}
                                            accept=".xlsx,.xls"
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                        Excel files only (.xlsx, .xls)
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Question Types Info */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <h4 className="text-gray-900 dark:text-white text-sm font-medium mb-2">Multiple Choice Questions (MCQ)</h4>
                            <ul className="text-gray-600 dark:text-gray-400 text-xs space-y-1">
                                <li>• Question text</li>
                                <li>• 4 options (A, B, C, D)</li>
                                <li>• Correct answer</li>
                                <li>• Points value</li>
                            </ul>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <h4 className="text-gray-900 dark:text-white text-sm font-medium mb-2">Text-based Questions</h4>
                            <ul className="text-gray-600 dark:text-gray-400 text-xs space-y-1">
                                <li>• Question text</li>
                                <li>• Answer template/format</li>
                                <li>• Model answer (optional)</li>
                                <li>• Points value</li>
                            </ul>
                        </div>
                    </div>

                    {/* Upload Button */}
                    <div className="mt-8">
                        <button
                            onClick={handleUpload}
                            disabled={!uploadedFile || !selectedCourse || !testTitle || isProcessing}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Processing Questions...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5" />
                                    Upload & Process
                                </>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                    <div className="text-center mb-6">
                        <div className="inline-block p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-500" />
                        </div>
                        <h3 className="text-gray-900 dark:text-white text-lg font-bold mb-2">Questions Uploaded Successfully!</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Test questions have been processed and added to the course
                        </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 mb-6">
                        <h4 className="text-gray-900 dark:text-white font-medium mb-4">Upload Summary</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Questions</p>
                                <p className="text-gray-900 dark:text-white font-medium">{uploadResult.questionsAdded}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">MCQ Questions</p>
                                <p className="text-gray-900 dark:text-white font-medium">{uploadResult.mcqQuestions}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Text Questions</p>
                                <p className="text-gray-900 dark:text-white font-medium">{uploadResult.textQuestions}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Errors</p>
                                <p className="text-gray-900 dark:text-white font-medium">{uploadResult.errors}</p>
                            </div>
                        </div>
                    </div>

                    {uploadResult.errors === 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                                <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    All questions were successfully processed and validated.
                                    Students can now access the test module.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                setUploadResult(null);
                                setUploadedFile(null);
                                setSelectedCourse('');
                            }}
                            className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Upload More Questions
                        </button>
                        <button
                            onClick={() => router.push('/admin')}
                            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
