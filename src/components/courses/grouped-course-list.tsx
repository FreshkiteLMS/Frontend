
"use client";

import { Course } from '@/types/course';
import { CourseCard } from './course-card';

interface GroupedCourseListProps {
    groupedCourses: Record<string, Course[]>;
    selectedCategory: string;
}

export function GroupedCourseList({ groupedCourses, selectedCategory }: GroupedCourseListProps) {
    const categories = Object.keys(groupedCourses);

    // Filter categories based on selection
    const displayCategories = selectedCategory === 'All'
        ? categories
        : categories.filter(cat => {
            // Simple mapping for demonstration, adjust based on actual data
            if (selectedCategory === 'Development') return cat.includes('development');
            if (selectedCategory === 'Data Science') return cat.includes('data_science');
            if (selectedCategory === 'AI/ML') return cat.includes('ai_ml');
            return cat.toLowerCase() === selectedCategory.toLowerCase();
        });

    if (categories.length === 0) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500">No courses found matching your criteria.</p>
            </div>
        );
    }

    return (
        <div className="space-y-16">
            {displayCategories.map(category => (
                <div key={category} className="space-y-8">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white capitalize">
                            {category.replace(/_/g, ' ')}
                        </h2>
                        <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                            {groupedCourses[category].length} Courses
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {groupedCourses[category].map(course => (
                            <CourseCard key={course.id} course={course} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
