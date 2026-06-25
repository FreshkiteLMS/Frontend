
"use client";

import { Course } from '@/types/course';
import { BookOpen } from 'lucide-react';
import Image from 'next/image';
import { CourseCard } from './course-card';

interface PathCardProps {
    path: {
        title: string;
        description: string;
        price: number;
        originalPrice?: number;
        thumbnailUrl: string;
        category: string;
        duration: string;
        modules: Course[];
    };
}

export function PathCard({ path }: PathCardProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row mb-8">
            <div className="md:w-5/12 relative min-h-[300px]">
                <Image
                    src={path.thumbnailUrl}
                    alt={path.title}
                    fill
                    className="object-cover"
                />
            </div>
            <div className="md:w-7/12 p-8">
                <div className="flex justify-between items-start mb-4">
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        <span>{path.category}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span>{path.duration}</span>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-gray-900 dark:text-white">${path.price}</div>
                        {path.originalPrice && (
                            <div className="text-xs text-gray-400 line-through">${path.originalPrice} Value</div>
                        )}
                    </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{path.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 line-clamp-2">{path.description}</p>

                <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Included Modules</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {path.modules.map((module) => (
                            <CourseCard key={module.id} course={module} compact />
                        ))}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg shadow-blue-500/20 text-sm">
                        Enroll in Full Path - ${path.price}
                    </button>
                    <button className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 px-6 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                        View Curriculum
                    </button>
                </div>
            </div>
        </div>
    );
}
