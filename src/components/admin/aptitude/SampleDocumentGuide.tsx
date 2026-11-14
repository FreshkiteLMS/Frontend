"use client";

import { useState } from 'react';
import { Check, ChevronDown, Copy, Download, ExternalLink, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

/** One source of truth for the sample, rendered as text, HTML (for pasting / download) and on screen. */
type Block = { h: 1 | 2 | 3; text: string } | { p: string };

const SAMPLE: Block[] = [
    { h: 1, text: 'QUANTITATIVE APTITUDE' },
    { h: 2, text: 'CONCEPT: TIME AND DISTANCE' },
    { h: 3, text: 'Question 1' },
    { p: 'A train travels 120 km in 2 hours. What is its average speed?' },
    { p: 'A. 40 km/hr\nB. 50 km/hr\nC. 60 km/hr\nD. 80 km/hr' },
    { p: 'Correct Answer: C' },
    { p: 'Explanation: Speed = Distance / Time = 120 / 2 = 60 km/hr.' },
    { p: 'Difficulty: Easy' },
    { h: 3, text: 'Question 2' },
    { p: 'A person travels at 40 km/hr for 3 hours. What distance does the person cover?' },
    { p: 'A. 100 km\nB. 120 km\nC. 140 km\nD. 160 km' },
    { p: 'Correct Answer: B' },
    { p: 'Explanation: Distance = Speed × Time = 40 × 3 = 120 km.' },
    { p: 'Difficulty: Easy' },
    { h: 2, text: 'CONCEPT: PERCENTAGE' },
    { h: 3, text: 'Question 3' },
    { p: 'What is 25% of 400?' },
    { p: 'A. 50\nB. 75\nC. 100\nD. 125' },
    { p: 'Correct Answer: C' },
    { p: 'Explanation: 25% of 400 = 100.' },
    { p: 'Difficulty: Easy' },
    { h: 3, text: 'Question 4' },
    { p: 'A student scores 360 marks out of 450. What percentage did the student score?' },
    { p: 'A. 70%\nB. 75%\nC. 80%\nD. 85%' },
    { p: 'Correct Answer: C' },
    { p: 'Explanation: (360 / 450) × 100 = 80%.' },
    { p: 'Difficulty: Medium' },
];

const RULES = [
    'Give every concept its own heading, e.g. “CONCEPT: TIME AND DISTANCE” (Heading 2 in Google Docs).',
    'Start every question with a number or heading, e.g. “Question 1” (Heading 3), so questions don’t run together.',
    'List options on their own lines with consistent labels: A. B. C. D. (or (a) (b) (c) (d)). 2–8 options per question.',
    'Give exactly one correct answer per question on a line like “Correct Answer: C”, right after the options.',
    'Explanation and difficulty (Easy / Medium / Hard) are optional.',
    'Numbers, units and expressions are copied exactly — write them as you want students to see them.',
    'Questions without a clear answer, or with more than one, are flagged and hidden until you fix them.',
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const SAMPLE_TEXT = SAMPLE.map(b => ('h' in b ? `${'#'.repeat(b.h)} ${b.text}` : b.p)).join('\n\n');
const SAMPLE_HTML = SAMPLE.map(b => ('h' in b ? `<h${b.h}>${esc(b.text)}</h${b.h}>` : `<p>${esc(b.p).replace(/\n/g, '<br>')}</p>`)).join('\n');
const SAMPLE_FILE = `<!doctype html><html><head><meta charset="utf-8"><title>Aptitude question template</title></head><body>\n${SAMPLE_HTML}\n</body></html>`;

async function copyTemplate(): Promise<boolean> {
    try {
        // Rich copy keeps heading levels when pasted into Google Docs.
        if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
            await navigator.clipboard.write([new ClipboardItem({
                'text/html': new Blob([SAMPLE_HTML], { type: 'text/html' }),
                'text/plain': new Blob([SAMPLE_TEXT], { type: 'text/plain' }),
            })]);
            return true;
        }
        await navigator.clipboard.writeText(SAMPLE_TEXT);
        return true;
    } catch {
        return false;
    }
}

function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([SAMPLE_FILE], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aptitude-question-template.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/** How to prepare the aptitude Google Doc, with a sample the admin can copy straight into Google Docs. */
export function SampleDocumentGuide({ defaultOpen = true }: { defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    const [copied, setCopied] = useState(false);

    const onCopy = async () => {
        if (await copyTemplate()) {
            setCopied(true);
            toast.success('Template copied — paste it into a new Google Doc.');
            setTimeout(() => setCopied(false), 2500);
        } else {
            toast.error('Your browser blocked copying. Use “Download template” instead.');
        }
    };

    return (
        <section aria-labelledby="apt-sample-h" className="rounded-2xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20">
            <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-center gap-3 p-5 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300"><FileText className="h-5 w-5" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                    <span id="apt-sample-h" className="block font-semibold text-gray-900 dark:text-white">How to prepare your aptitude document</span>
                    <span className="block text-sm text-gray-600 dark:text-gray-400">Concept headings, numbered questions, A–D options and a “Correct Answer” line. Start from the sample template.</span>
                </span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden="true" />
            </button>

            {open && (
                <div className="grid gap-5 border-t border-blue-100 p-5 lg:grid-cols-2 dark:border-blue-900/50">
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Rules</h4>
                            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-gray-700 dark:text-gray-300">
                                {RULES.map(r => <li key={r}>{r}</li>)}
                            </ol>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Get the template</h4>
                            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-gray-700 dark:text-gray-300">
                                <li>Copy the template (headings are kept) and paste it into a new Google Doc — or download it and open it with Google Docs.</li>
                                <li>Replace the sample questions with yours, keeping the same layout.</li>
                                <li>Click <b>Share</b> → General access → <b>Anyone with the link</b> → <b>Viewer</b>.</li>
                                <li>Copy the document’s link and paste it below.</li>
                            </ol>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button type="button" onClick={onCopy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                                    {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />} {copied ? 'Copied' : 'Copy template'}
                                </button>
                                <a href="https://docs.new" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                    <ExternalLink className="h-4 w-4" aria-hidden="true" /> New Google Doc
                                </a>
                                <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                    <Download className="h-4 w-4" aria-hidden="true" /> Download template
                                </button>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Sample document</h4>
                        <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-900" aria-label="Sample aptitude document">
                            {SAMPLE.map((b, i) => 'h' in b ? (
                                b.h === 1 ? <p key={i} className="text-base font-bold text-gray-900 dark:text-white">{b.text}</p>
                                    : b.h === 2 ? <p key={i} className="mt-4 font-semibold text-blue-700 dark:text-blue-300">{b.text}</p>
                                        : <p key={i} className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{b.text}</p>
                            ) : (
                                <p key={i} className={`mt-1 whitespace-pre-line ${b.p.startsWith('Correct Answer') ? 'font-semibold text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>{b.p}</p>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
