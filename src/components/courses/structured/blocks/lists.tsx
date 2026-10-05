import { memo } from 'react';
import type { BlockOf } from '@/types/structured-course';

export const BulletListBlockView = memo(function BulletListBlockView({ block }: { block: BlockOf<'bullet_list'> }) {
    return (
        <ul className="my-5 space-y-2.5">
            {block.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-[17px] text-gray-700 dark:text-gray-300 leading-[1.8]">
                    <span aria-hidden="true" className="flex-shrink-0 mt-[11px] w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500" />
                    <span className="whitespace-pre-line">{item}</span>
                </li>
            ))}
        </ul>
    );
});

export const NumberedListBlockView = memo(function NumberedListBlockView({ block }: { block: BlockOf<'numbered_list'> }) {
    return (
        <ol className="my-6 space-y-3.5">
            {block.items.map((item, i) => (
                <li key={i} className="flex items-start gap-4">
                    <span aria-hidden="true" className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                    </span>
                    <span className="flex-1 text-[17px] text-gray-700 dark:text-gray-300 leading-[1.8] pt-0.5 whitespace-pre-line">{item}</span>
                </li>
            ))}
        </ol>
    );
});
