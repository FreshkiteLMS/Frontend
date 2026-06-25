"use client";

import { Course } from '@/types/course';
import { Clock, BarChart, Check, BookOpen } from 'lucide-react';
import PaymentButton from '../payment/PaymentButton';
import { useAuth } from '@/hooks/use-auth';

interface CourseCardProps {
    course: Course;
    compact?: boolean;
    showSubContent?: boolean;
    subContent?: any[];
    isOwned?: boolean;
}

export function CourseCard({ course, compact = false, showSubContent = false, subContent = [], isOwned = false }: CourseCardProps) {
    const { user } = useAuth();
    const isCohort = (course as any).type === 'cohort' || (course as any).is_group;

    if (compact) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className="flex justify-between items-start gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1 leading-snug">
                        {course.title || (course as any).name}
                    </h4>
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-xs shrink-0">
                        ₹{course.price?.toLocaleString()}
                    </span>
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-1.5 block">
                    {course.category || 'Course'}
                </span>
            </div>
        );
    }

    const difficultyColors: Record<string, string> = {
        beginner: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
        intermediate: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
        advanced: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    };
    const diffKey = (course.difficulty || 'beginner').toLowerCase();
    const diffStyle = difficultyColors[diffKey] || difficultyColors.beginner;

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col h-full group">
            {/* Thumbnail */}
            <div className="relative h-44 w-full overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                {(course.thumbnail_url || (course as any).image_url) ? (
                    <img
                        src={course.thumbnail_url || (course as any).image_url}
                        alt={course.title || (course as any).name || 'Course'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full bg-linear-to-br from-blue-600 to-indigo-700 flex flex-col items-center justify-center p-5 gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white/80" />
                        </div>
                        <span className="text-white font-bold text-center text-sm line-clamp-2 leading-snug">
                            {course.title || (course as any).name || 'Course'}
                        </span>
                    </div>
                )}
                {/* Category overlay */}
                {course.category && (
                    <div className="absolute top-3 left-3">
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-200 backdrop-blur-sm px-2.5 py-1 rounded-full">
                            {course.category.replace(/_/g, ' ')}
                        </span>
                    </div>
                )}
                {isCohort && (
                    <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-600 text-white px-2.5 py-1 rounded-full">
                            Live Cohort
                        </span>
                    </div>
                )}
            </div>

            <div className="p-5 flex flex-col flex-1">
                {/* Title */}
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1.5 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {course.title || (course as any).name}
                </h3>

                {/* Description */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                    {course.description || "Learn the fundamentals and master this subject with hands-on projects."}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-2 mb-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${diffStyle}`}>
                        {course.difficulty || 'Beginner'}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
                        <Clock className="w-3 h-3" />
                        {course.estimated_duration || 0}h
                    </div>
                </div>

                {/* Sub-content (bundle courses) */}
                {showSubContent && subContent.length > 0 && (
                    <div className="mb-4 space-y-1.5 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1.5">Includes:</p>
                        {subContent.slice(0, 4).map((ce, idx) => {
                            const sub = typeof ce.courseId === 'object' ? ce.courseId as any : null;
                            return (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 truncate">
                                        {sub?.title || (course as any).name}
                                    </span>
                                </div>
                            );
                        })}
                        {subContent.length > 4 && (
                            <p className="text-[10px] text-gray-400 italic pl-3.5">+{subContent.length - 4} more courses</p>
                        )}
                    </div>
                )}

                {/* Price + Buy */}
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xl font-black text-gray-900 dark:text-white">
                            ₹{(course.price || 0).toLocaleString()}
                        </span>
                    </div>
                    {isOwned ? (
                        <div className="w-full flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold text-xs py-2.5 rounded-xl border border-green-200 dark:border-green-800">
                            <Check className="w-3.5 h-3.5" /> Enrolled
                        </div>
                    ) : (
                        <PaymentButton
                            amount={(course.price || 0) * 100}
                            currency="INR"
                            courseId={(course as any)._id || course.id}
                            itemType={isCohort ? 'bundle' : 'course'}
                            userDetails={{
                                name: user?.name || '',
                                email: user?.email || '',
                                contact: (user as any)?.contact || ''
                            }}
                            label="Enroll Now"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
