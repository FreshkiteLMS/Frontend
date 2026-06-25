import React from 'react';
import { Course } from '@/types/course';
import { Clock, BarChart, Tag } from 'lucide-react';

interface CourseCardProps {
    course: Course;
}

const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
    const difficultyColor = {
        beginner: 'text-green-600 bg-green-50 border-green-200',
        intermediate: 'text-blue-600 bg-blue-50 border-blue-200',
        advanced: 'text-red-600 bg-red-50 border-red-200',
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col h-full">
            {/* Thumbnail Placeholder */}
            <div className="h-40 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-6 text-white text-center">
                <h3 className="text-lg font-bold line-clamp-2">{course.title}</h3>
            </div>

            <div className="p-5 flex-grow flex flex-col">
                <div className="flex items-center justify-between mb-3 text-xs font-medium uppercase tracking-wider">
                    <span className={`px-2 py-1 rounded-md border ${difficultyColor[course.difficulty || 'beginner']}`}>
                        {course.difficulty || 'Beginner'}
                    </span>
                    <span className="text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {course.estimated_duration || 0} hrs
                    </span>
                </div>

                <p className="text-gray-600 text-sm line-clamp-2 mb-4 flex-grow">
                    {course.description || "Learn the fundamentals and master this subject with hands-on projects."}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                    <div className="flex items-center gap-1 text-indigo-600 font-bold">
                        <Tag className="w-4 h-4" />
                        <span>₹{course.price.toLocaleString()}</span>
                    </div>
                    <button className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                        View Details
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CourseCard;
