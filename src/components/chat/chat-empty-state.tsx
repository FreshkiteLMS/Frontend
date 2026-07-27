"use client";

import { MessagesSquare, ShieldCheck, Users, Zap } from 'lucide-react';

export function ChatEmptyState() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center bg-gray-50 dark:bg-gray-950">
            <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center mb-5">
                <MessagesSquare className="w-10 h-10 text-gray-300 dark:text-gray-700" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your messages</h2>
            <p className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                Pick a conversation from the list, or start a new chat to message classmates,
                batch groups and course channels.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
                <Hint icon={<Users className="w-4 h-4" />} title="Groups" text="Batch and course channels" />
                <Hint icon={<Zap className="w-4 h-4" />} title="Realtime" text="Typing, receipts, presence" />
                <Hint icon={<ShieldCheck className="w-4 h-4" />} title="Private" text="Only members can read" />
            </div>
        </div>
    );
}

function Hint({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-left">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <span className="text-blue-600 dark:text-blue-400">{icon}</span>
                <span className="text-sm font-semibold">{title}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{text}</p>
        </div>
    );
}
