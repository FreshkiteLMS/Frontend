import { memo, type ReactNode } from 'react';
import { AlertTriangle, Info, Lightbulb } from 'lucide-react';
import type { BlockOf } from '@/types/structured-course';

const VARIANTS = {
    note: {
        wrap: 'bg-blue-50 dark:bg-blue-950/25 border-blue-200 dark:border-blue-800/50 border-l-blue-400 dark:border-l-blue-500',
        icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />,
        label: 'Note',
        labelColor: 'text-blue-700 dark:text-blue-400',
        textColor: 'text-blue-950 dark:text-blue-100',
    },
    tip: {
        wrap: 'bg-amber-50 dark:bg-amber-950/25 border-amber-200 dark:border-amber-800/50 border-l-amber-400 dark:border-l-amber-500',
        icon: <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />,
        label: 'Tip',
        labelColor: 'text-amber-700 dark:text-amber-400',
        textColor: 'text-amber-950 dark:text-amber-100',
    },
    warning: {
        wrap: 'bg-red-50 dark:bg-red-950/25 border-red-200 dark:border-red-800/50 border-l-red-400 dark:border-l-red-500',
        icon: <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />,
        label: 'Warning',
        labelColor: 'text-red-700 dark:text-red-400',
        textColor: 'text-red-950 dark:text-red-100',
    },
} as const;

export type CalloutVariant = keyof typeof VARIANTS;

/** Presentational callout shell — shared by note/tip/warning blocks and legacy sections. */
export function CalloutView({ variant, title, children }: { variant: CalloutVariant; title?: string; children: ReactNode }) {
    const v = VARIANTS[variant];
    return (
        <aside role="note" className={`my-6 flex gap-3.5 px-4 py-4 rounded-xl border border-l-4 ${v.wrap}`}>
            {v.icon}
            <div className="min-w-0">
                <p className={`text-[13px] font-bold mb-0.5 ${v.labelColor}`}>{title || v.label}</p>
                <div className={`text-[15px] leading-[1.75] whitespace-pre-line ${v.textColor}`}>{children}</div>
            </div>
        </aside>
    );
}

export const CalloutBlockView = memo(function CalloutBlockView({ block }: { block: BlockOf<'callout'> }) {
    return <CalloutView variant="note" title={block.title}>{block.text}</CalloutView>;
});

export const TipBlockView = memo(function TipBlockView({ block }: { block: BlockOf<'tip'> }) {
    return <CalloutView variant="tip" title={block.title}>{block.text}</CalloutView>;
});

export const WarningBlockView = memo(function WarningBlockView({ block }: { block: BlockOf<'warning'> }) {
    return <CalloutView variant="warning" title={block.title}>{block.text}</CalloutView>;
});
