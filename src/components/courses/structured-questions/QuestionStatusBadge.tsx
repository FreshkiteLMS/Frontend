import { CheckCircle2, Circle, CircleDot, XCircle, Award } from 'lucide-react';
import { QUESTION_STATUS_LABELS, type QuestionStatus } from '@/types/structured-questions';
import { STATUS_STYLES } from '@/lib/question-progress';

const ICONS: Record<QuestionStatus, typeof Circle> = {
    NOT_STARTED: Circle,
    IN_PROGRESS: CircleDot,
    COMPLETED: CheckCircle2,
    PASS: Award,
    FAIL: XCircle,
};

export function QuestionStatusBadge({ status }: { status: QuestionStatus }) {
    const Icon = ICONS[status] ?? Circle;
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status] ?? STATUS_STYLES.NOT_STARTED}`}
        >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {QUESTION_STATUS_LABELS[status] ?? status}
        </span>
    );
}
