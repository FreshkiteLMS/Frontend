"use client";

import { MotionConfig } from 'framer-motion';
import type { Catalog } from '@/types/catalog';
import { useCatalog } from '@/hooks/use-catalog';
import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from './HeroSection';
import { StatsSection } from './StatsSection';
import { ProgramsSection } from './ProgramsSection';
import { CurriculumShowcase } from './CurriculumShowcase';
import { BundleShowcase } from './BundleShowcase';
import { FeaturesSection } from './FeaturesSection';
import { HowItWorksSection } from './HowItWorksSection';
import { LearningExperience } from './LearningExperience';
import { TestimonialsSection } from './TestimonialsSection';
import { MentorsSection } from './MentorsSection';
import { CTASection } from './CTASection';
import { HomeFooter } from './HomeFooter';

/** The public homepage. `initialCatalog` is server-rendered; every section shares one catalog. */
export function HomeLanding({ initialCatalog }: { initialCatalog: Catalog | null }) {
    const { catalog, loading, error, retry } = useCatalog(initialCatalog);
    return (
        <MotionConfig reducedMotion="user">
            <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white font-sans min-h-screen overflow-x-clip">
                <Navbar />
                <main>
                    <HeroSection catalog={catalog} loading={loading} />
                    <StatsSection stats={catalog?.stats ?? null} />
                    <ProgramsSection catalog={catalog} loading={loading} error={error} onRetry={retry} />
                    <CurriculumShowcase catalog={catalog} />
                    <BundleShowcase catalog={catalog} />
                    <FeaturesSection stats={catalog?.stats ?? null} />
                    <HowItWorksSection />
                    <LearningExperience stats={catalog?.stats ?? null} />
                    <TestimonialsSection />
                    <MentorsSection />
                    <CTASection />
                </main>
                <HomeFooter categories={catalog?.categories} />
            </div>
        </MotionConfig>
    );
}
