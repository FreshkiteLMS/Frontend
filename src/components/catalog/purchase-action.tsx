"use client";

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import PaymentButton from '@/components/payment/PaymentButton';
import { useAuth } from '@/hooks/use-auth';
import { useCourseAccess } from '@/hooks/use-course-access';
import { loginHref, studentStoreHref } from '@/lib/catalog';
import { useMounted } from './ui';

/** Product id for the All-In-One plan, as the existing checkout expects it. */
export const ALL_ACCESS_ITEM_ID = 'master-subscription';

export type PurchasableProduct =
    | { type: 'course'; id: string; mongoId?: string; name: string; price: number }
    | { type: 'bundle'; id: string; name: string; price: number; courseIds: string[] }
    | { type: 'all-access'; name: string; price: number };

const SIZES = {
    sm: 'h-10 px-4 text-sm rounded-xl',
    lg: 'h-12 px-6 text-[15px] rounded-xl',
} as const;

const primary = 'inline-flex w-full items-center justify-center gap-2 font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/35 transition-all duration-200 hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900';
const owned = 'inline-flex w-full items-center justify-center gap-2 font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors';

const defaultLabel = (p: PurchasableProduct) => (p.type === 'course' ? 'Enroll now' : p.type === 'bundle' ? 'Buy bundle' : 'Get full access');

/**
 * The buy button for a course, bundle or the All-In-One plan, in every state:
 *  - signed out → log in (then back to this product in the student store);
 *  - staff → nothing (they don't buy);
 *  - student, access still loading → placeholder (never offer to buy something owned);
 *  - owned (directly, via a bundle or full access) → open it;
 *  - otherwise → the existing PaymentButton (coupon sheet → Razorpay → server verification).
 */
export function PurchaseAction({ product, size = 'sm', label, secondary }: {
    product: PurchasableProduct;
    size?: keyof typeof SIZES;
    label?: string;
    /** Extra control shown under the buy button for students who don't own it (e.g. request approval). */
    secondary?: ReactNode;
}) {
    const mounted = useMounted();
    const { user } = useAuth();
    const access = useCourseAccess();
    const sz = SIZES[size];
    const text = label ?? defaultLabel(product);

    const storeTarget = product.type === 'course' ? { course: product.id } : product.type === 'bundle' ? { bundle: product.id } : {};

    // Server render and first client render agree on the signed-out state.
    if (!mounted || !user) {
        return (
            <Link href={loginHref(studentStoreHref(storeTarget))} className={`${primary} ${sz}`}>
                <Lock className="w-4 h-4 opacity-80" aria-hidden="true" />
                {text}
            </Link>
        );
    }
    if (user.role !== 'student') return null;

    const isOwned =
        product.type === 'course' ? access.hasCourse({ id: product.id, _id: product.mongoId })
            : product.type === 'bundle' ? access.ownsBundle({ _id: product.id, courses: product.courseIds.map(courseId => ({ courseId })) })
                : access.fullAccess;

    if (isOwned) {
        const href = product.type === 'course' ? `/student/courses/${product.id}` : '/student';
        return (
            <Link href={href} className={`${owned} ${sz}`}>
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                {product.type === 'course' ? 'Enrolled · Go to course' : 'Enrolled · Continue learning'}
            </Link>
        );
    }
    if (!access.ready) {
        return <div className={`w-full ${sz} bg-gray-100 dark:bg-gray-800 animate-pulse`} aria-label="Checking your access" role="status" />;
    }
    if (!(product.price > 0)) {
        return (
            <div className="w-full space-y-2">
                <span className={`inline-flex w-full items-center justify-center font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 ${sz}`}>
                    Not on sale yet
                </span>
                {secondary}
            </div>
        );
    }

    return (
        <div className="w-full space-y-2">
            <PaymentButton
                amount={Math.round(product.price * 100)}
                currency="INR"
                courseId={product.type === 'course' ? product.id : product.type === 'bundle' ? product.id : ALL_ACCESS_ITEM_ID}
                itemType={product.type === 'course' ? 'course' : 'bundle'}
                productName={product.name}
                userDetails={{ name: user.name || '', email: user.email || '', contact: '' }}
                label={text}
                className={`${primary} ${sz}`}
            />
            {secondary}
        </div>
    );
}

/** Secondary "view details" link/button styling shared by cards. */
export const secondaryButton = 'inline-flex items-center justify-center gap-1.5 font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-300 transition-colors';

export function DetailsArrow() {
    return <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" aria-hidden="true" />;
}
