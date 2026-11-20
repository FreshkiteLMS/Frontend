/** Public catalog (GET /api/v1/catalog…). Mirrors Backend/src/services/catalogService.ts. */

export type CatalogKind = 'structured' | 'legacy' | 'problems' | 'aptitude';
export type CatalogUnit = 'lessons' | 'problems' | 'questions';

export interface CatalogCounts {
    modules: number;
    /** Lessons, problems or questions — see `unit`. */
    lessons: number;
    unit: CatalogUnit;
    audioQuestions: number;
    assignments: number;
}

export interface CatalogCourse {
    /** Course UUID — what checkout and course routes use. */
    id: string;
    _id: string;
    title: string;
    description: string;
    category: string | null;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
    templateType: string;
    kind: CatalogKind;
    /** Rupees. Checkout re-prices on the server. */
    price: number;
    thumbnailUrl: string | null;
    estimatedHours: number | null;
    tags: string[];
    counts: CatalogCounts;
    bundleIds: string[];
    createdAt: string | null;
    updatedAt: string | null;
}

export interface CatalogBundle {
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    price: number;
    courseIds: string[];
    courseCount: number;
    totals: { modules: number; lessons: number };
    combinedPrice: number;
    savings: number;
    savingsPercent: number;
    createdAt: string | null;
}

export interface CatalogStats {
    courses: number;
    bundles: number;
    modules: number;
    lessons: number;
    problems: number;
    aptitudeQuestions: number;
    audioQuestions: number;
    assignments: number;
    students: number;
    categories: number;
}

export interface Catalog {
    courses: CatalogCourse[];
    bundles: CatalogBundle[];
    categories: { key: string; count: number }[];
    stats: CatalogStats;
    allAccess: { price: number; currency: string; courseCount: number };
    currency: string;
    generatedAt: string;
}

export interface CurriculumLesson { id: string; title: string; difficulty?: string }
export interface CurriculumModule {
    id: string;
    title: string;
    description: string;
    lessonCount: number;
    /** Empty for aptitude concepts (their questions are not public). */
    lessons: CurriculumLesson[];
}

export interface CatalogCourseDetail extends CatalogCourse {
    overview: string;
    learningObjectives: string[];
    curriculum: { unit: CatalogUnit; modules: CurriculumModule[] };
    bundles: { id: string; name: string; price: number; courseCount: number }[];
}

export interface CatalogBundleDetail extends CatalogBundle {
    courses: CatalogCourseDetail[];
}
