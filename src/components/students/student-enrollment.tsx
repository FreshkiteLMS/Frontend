
"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Mail, Key, CheckCircle, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { studentService } from '@/services/api/student.api';
import { batchService } from '@/services/api/batch.api';
import { Batch } from '@/types/batch';

export function StudentEnrollment() {
    const router = useRouter();
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        batch: '',
        phone: ''
    });
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [batches, setBatches] = useState<Batch[]>([]);

    useEffect(() => {
        const fetchBatches = async () => {
            try {
                const result: any = await batchService.getAll(1, 100);
                if (result.data && Array.isArray(result.data)) {
                    setBatches(result.data);
                }
            } catch (error) {
                console.error("Failed to load batches", error);
            }
        };
        fetchBatches();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const result = await studentService.enrollStudent({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                batch: formData.batch
            });

            if (result.temporaryPassword) {
                setGeneratedPassword(result.temporaryPassword);
            } else {
                setGeneratedPassword("Sent to email");
            }

            setStep('success');
        } catch (error) {
            toast.error('Failed to enroll student. Please try again.');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
    };

    const handleEnrollAnother = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            batch: '',
            phone: ''
        });
        setGeneratedPassword('');
        setStep('form');
    };

    if (step === 'success') {
        return (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                    <div className="text-center mb-6">
                        <div className="inline-block p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Student Enrolled Successfully!</h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            {formData.firstName} {formData.lastName} has been added to the system
                        </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 mb-6">
                        <h3 className="text-gray-900 dark:text-white font-medium mb-4">Student Details</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Name:</span>
                                <span className="text-gray-900 dark:text-white font-medium">{formData.firstName} {formData.lastName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Email:</span>
                                <span className="text-gray-900 dark:text-white font-medium">{formData.email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Batch:</span>
                                <span className="text-gray-900 dark:text-white font-medium">{batches.find(b => b.id === formData.batch)?.name || formData.batch}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                        <div className="flex items-start gap-3 mb-4">
                            <Key className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                            <div className="flex-1">
                                <h4 className="text-gray-900 dark:text-white font-medium mb-2">Temporary Password Generated</h4>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                    This password has been generated and sent to the student&apos;s email.
                                    The student will be required to change it on first login.
                                </p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-white dark:bg-gray-800 px-4 py-3 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-mono text-lg tracking-wider">
                                        {generatedPassword}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(generatedPassword)}
                                        className="p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        title="Copy to clipboard"
                                    >
                                        <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <Mail className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-gray-900 dark:text-white text-sm font-medium mb-1">Email Sent</h4>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Welcome email with login credentials has been sent to {formData.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => router.push('/admin')}
                            className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Back to Dashboard
                        </button>
                        <button
                            onClick={handleEnrollAnother}
                            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <UserPlus className="w-5 h-5" />
                            Enroll Another Student
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <button
                    onClick={() => router.push('/admin')}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Dashboard
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Enroll New Student</h2>
                <p className="text-gray-600 dark:text-gray-400">Add a new student to the training management system</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">First Name</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="John"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Last Name</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="Doe"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="john.doe@example.com"
                            required
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Login credentials will be sent to this email
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="+91"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Assign to Batch</label>
                        <select
                            value={formData.batch}
                            onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            required
                        >
                            <option value="">Select a batch</option>
                            {batches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Key className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-gray-900 dark:text-white text-sm font-medium mb-1">Password Generation</h4>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                    Upon submission, a temporary password will be generated and sent
                                    to the student&apos;s email. The student will be required to change the password on first login.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => router.push('/admin')}
                            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Enroll Student
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
