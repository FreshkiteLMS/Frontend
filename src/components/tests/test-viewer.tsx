
"use client";

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { testService } from '@/services/api/test.api';
import { useAuth } from '@/hooks/use-auth';

interface TestViewerProps {
    testId: string;
}

export function TestViewer({ testId }: TestViewerProps) {
    const router = useRouter();
    const { user, isLoading: _authLoading } = useAuth();

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<{ [key: string]: any }>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(45 * 60); // 45 minutes in seconds
    const [showResults, setShowResults] = useState(false);
    const [questions, setQuestions] = useState<any[]>([]);
    const [testData, setTestData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submissionResult, setSubmissionResult] = useState<any>(null);

    useEffect(() => {
        const fetchTestContent = async () => {
            try {
                setLoading(true);
                const data = await testService.getTest(testId);
                setTestData(data);

                const mappedQuestions = (data.questions || []).map((q: any) => {
                    const options = [];
                    if (q.optionA) options.push(q.optionA);
                    if (q.optionB) options.push(q.optionB);
                    if (q.optionC) options.push(q.optionC);
                    if (q.optionD) options.push(q.optionD);

                    return {
                        id: q.id,
                        type: q.questionType,
                        question: q.questionText,
                        options: options,
                        correctAnswer: q.correctAnswer,
                        points: q.points
                    };
                });

                setQuestions(mappedQuestions);
                if (data.duration) {
                    setTimeRemaining(data.duration * 60);
                }
            } catch (error) {
                console.error('Error fetching test questions:', error);
                toast.error('Failed to load test questions. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (testId) {
            fetchTestContent();
        }
    }, [testId]);

    const handleMCQAnswer = (questionId: string, optionIndex: number) => {
        setAnswers({ ...answers, [questionId]: optionIndex });
    };

    const handleTextAnswer = (questionId: string, text: string) => {
        setAnswers({ ...answers, [questionId]: text });
    };

    const handleSubmit = useCallback(async () => {
        if (!user || !testData) return;
        try {
            setIsSubmitted(true);

            const formattedAnswers = Object.keys(answers).map(questionId => {
                const answer = answers[questionId];
                const question = questions.find(q => q.id === questionId);

                let answerText = '';
                if (question?.type === 'mcq') {
                    const options = ['A', 'B', 'C', 'D'];
                    answerText = options[answer as number] || '';
                } else {
                    answerText = answer as string;
                }

                return {
                    questionId,
                    answerText
                };
            });

            const result = await testService.submitTest(testId, user.id, formattedAnswers);
            setSubmissionResult(result);
            setShowResults(true);
        } catch (error) {
            console.error('Error submitting test:', error);
            toast.error('Failed to submit test. Please try again.');
            setIsSubmitted(false);
        }
    }, [user, testData, answers, questions, testId]);

    useEffect(() => {
        if (!isSubmitted && !showResults && timeRemaining > 0) {
            const timer = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isSubmitted, showResults, timeRemaining, handleSubmit]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading test...</p>
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <p className="mb-4">No questions available for this test.</p>
                <button onClick={() => router.back()} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Go Back</button>
            </div>
        );
    }

    if (showResults && submissionResult) {
        const score = submissionResult.correctCount ?? 0;
        const total = submissionResult.totalQuestions ?? questions.length;
        const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                    <div className="text-center mb-8">
                        <div className={`inline-block p-4 rounded-full mb-4 ${percentage >= (testData?.passingScore || 70) ? 'bg-green-100 dark:bg-green-900/30' : 'bg-orange-100 dark:bg-orange-900/30'
                            }`}>
                            {percentage >= (testData?.passingScore || 70) ? (
                                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-500" />
                            ) : (
                                <AlertCircle className="w-12 h-12 text-orange-600 dark:text-orange-500" />
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Test Submitted Successfully!</h2>
                        <p className="text-gray-600 dark:text-gray-400">{testData?.courseName}</p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 mb-6">
                        <h3 className="text-gray-900 dark:text-white font-medium mb-4">Your Results</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Score</p>
                                <p className="text-gray-900 dark:text-white font-medium">
                                    {score} / {total}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Percentage</p>
                                <p className="text-gray-900 dark:text-white font-medium">{percentage}%</p>
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                            <div
                                className={`h-3 rounded-full ${percentage >= (testData?.passingScore || 70) ? 'bg-green-600' : 'bg-orange-600'
                                    }`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                        <p className="text-gray-700 dark:text-gray-300 text-sm">
                            <strong>Note:</strong> These results are for auto-graded questions (MCQ) only. Text answers will be graded by your instructor.
                        </p>
                    </div>

                    <button
                        onClick={() => router.push('/student')}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div >
        );
    }

    const question = questions[currentQuestion];
    const answeredQuestions = Object.keys(answers).length;
    const totalQuestions = questions.length;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Exit Test
                </button>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{testData?.courseName} - Test</h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Question {currentQuestion + 1} of {totalQuestions}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-blue-900 dark:text-blue-100 font-mono font-medium">{formatTime(timeRemaining)}</span>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="text-sm text-gray-900 dark:text-white font-medium">
                        {answeredQuestions} / {totalQuestions} answered
                    </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(answeredQuestions / totalQuestions) * 100}%` }}
                    />
                </div>
            </div>

            {/* Question Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-6">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-sm font-medium">
                                {question.type === 'mcq' ? 'Multiple Choice' : 'Text Answer'}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{question.points} points</span>
                        </div>
                        <h3 className="text-xl text-gray-900 dark:text-white mb-6 font-medium">{question.question}</h3>
                    </div>
                </div>

                {/* MCQ Options */}
                {question.type === 'mcq' && (
                    <div className="space-y-3">
                        {question.options.map((option: string, index: number) => (
                            <label
                                key={index}
                                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${answers[question.id] === index
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    checked={answers[question.id] === index}
                                    onChange={() => handleMCQAnswer(question.id, index)}
                                    className="mt-1"
                                />
                                <span className="flex-1 text-gray-900 dark:text-white">{option}</span>
                            </label>
                        ))}
                    </div>
                )}

                {/* Text Answer */}
                {question.type === 'text' && (
                    <div>
                        <textarea
                            value={answers[question.id] || ''}
                            onChange={(e) => handleTextAnswer(question.id, e.target.value)}
                            rows={8}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="Type your answer here..."
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Provide a detailed answer. This will be manually graded by your instructor.
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                    disabled={currentQuestion === 0}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Previous
                </button>

                {/* Question Dots */}
                <div className="hidden md:flex gap-2 flex-wrap justify-center mx-4">
                    {questions.map((_: any, index: number) => (
                        <button
                            key={index}
                            onClick={() => setCurrentQuestion(index)}
                            className={`w-8 h-8 rounded-full text-xs transition-colors ${currentQuestion === index
                                ? 'bg-blue-600 text-white'
                                : answers[questions[index].id] !== undefined
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            {index + 1}
                        </button>
                    ))}
                </div>

                {currentQuestion === totalQuestions - 1 ? (
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitted}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg flex items-center gap-2 transition-colors disabled:cursor-not-allowed"
                    >
                        {isSubmitted ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Submit Test
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentQuestion(Math.min(totalQuestions - 1, currentQuestion + 1))}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Next
                    </button>
                )}
            </div>
        </div>
    );
}
