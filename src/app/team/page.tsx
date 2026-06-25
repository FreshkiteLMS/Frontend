import { Metadata } from 'next';
import TeamPageClient from './TeamPageClient';

export const metadata: Metadata = {
    title: 'Our Team | FreshKite - The Innovators Behind the Scenes',
    description: 'Meet the visionary leaders and talented creators at FreshKite. Our diverse team of experts in Full Stack Development, UI/UX Design, Backend Engineering, and DevOps is dedicated to building the future of learning and earning.',
    openGraph: {
        title: 'Meet the FreshKite Team',
        description: 'The passionate individuals driving innovation and excellence at FreshKite.',
        images: ['/assets/freshkite_logo.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'FreshKite Team',
        description: 'Innovators building the future of education and technology.',
    },
};

export default function TeamPage() {
    return <TeamPageClient />;
}
