"use client";

import { Header } from '@/components/layout/header';
import { LeaderboardBoard } from '@/components/leaderboard/leaderboard-board';

export default function LeaderboardPage() {
    return (
        <>
            <Header />
            <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
                <LeaderboardBoard />
            </main>
        </>
    );
}
