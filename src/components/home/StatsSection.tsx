"use client";

const stats = [
    {
        value: '57 LPA',
        label: 'Highest Package',
        description: 'At Qualcomm — our top placement achievement',
    },
    {
        value: '100+',
        label: 'Years of Expertise',
        description: 'Combined industry experience across our mentorship team',
    },
    {
        value: '7+',
        label: 'Learning Tracks',
        description: 'From DSA to AI, ML, DevOps & Full Stack',
    },
    {
        value: '20+',
        label: 'LPA Average',
        description: 'Average package across our placed alumni',
    },
];

export function StatsSection() {
    return (
        <section className="border-y border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/30">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x lg:divide-gray-200 lg:dark:divide-gray-800">
                    {stats.map((stat, i) => (
                        <div key={i} className="lg:px-10 first:lg:pl-0 last:lg:pr-0 text-center lg:text-left">
                            <p className="text-4xl font-black text-gray-900 dark:text-white mb-1">
                                {stat.value}
                            </p>
                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-1.5">
                                {stat.label}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                {stat.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
