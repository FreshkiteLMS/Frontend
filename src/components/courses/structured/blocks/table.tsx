import { memo } from 'react';
import type { BlockOf } from '@/types/structured-course';

/** Presentational table — shared by structured table blocks and legacy sections. */
export const TableView = memo(function TableView({ headers, rows, caption }: { headers: string[]; rows: string[][]; caption?: string }) {
    return (
        <figure className="my-8">
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <table className="w-full text-sm">
                    {headers.length > 0 && (
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                {headers.map((h, i) => (
                                    <th key={i} scope="col" className="px-5 py-3.5 text-left text-[12px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    )}
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr key={ri} className={`border-b border-gray-100 dark:border-gray-800 last:border-0 ${ri % 2 === 1 ? 'bg-gray-50/60 dark:bg-gray-800/25' : ''}`}>
                                {row.map((cell, ci) => (
                                    <td key={ci} className="px-5 py-3.5 text-gray-700 dark:text-gray-300 leading-relaxed align-top whitespace-pre-line">
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {caption && <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400">{caption}</figcaption>}
        </figure>
    );
});

export const TableBlockView = memo(function TableBlockView({ block }: { block: BlockOf<'table'> }) {
    return <TableView headers={block.headers} rows={block.rows} caption={block.caption} />;
});
