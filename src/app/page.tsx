"use client";

import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/home/HeroSection';
import { StatsSection } from '@/components/home/StatsSection';
import { ProgramsSection } from '@/components/home/ProgramsSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { MentorsSection } from '@/components/home/MentorsSection';
import { CTASection } from '@/components/home/CTASection';
import { HomeFooter } from '@/components/home/HomeFooter';

export default function Home() {
    return (
        <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white font-sans min-h-screen">
            <Navbar />
            <HeroSection />
            <StatsSection />
            <ProgramsSection />
            <FeaturesSection />
            <HowItWorksSection />
            <TestimonialsSection />
            <MentorsSection />
            <CTASection />
            <HomeFooter />
        </div>
    );
}
