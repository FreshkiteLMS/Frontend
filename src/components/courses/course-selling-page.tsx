"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MotionConfig } from "framer-motion";
import { BookOpen, CheckCircle2, Clock, GraduationCap, Package, ShieldCheck } from "lucide-react";
import { SellingNavbar } from "@/components/layout/selling-navbar";
import { HomeFooter } from "@/components/home/HomeFooter";
import { bundleCourses } from "@/components/home/BundleShowcase";
import { CourseExplorer } from "@/components/catalog/course-explorer";
import { CatalogCourseCard } from "@/components/catalog/course-card";
import { AllAccessCard, CatalogBundleCard } from "@/components/catalog/bundle-card";
import { BundleDetailsLoader, CourseDetailsLoader } from "@/components/catalog/details";
import { EmptyState, ErrorState, Reveal, useMounted } from "@/components/catalog/ui";
import { Modal } from "@/components/ui/modal";
import { RequestApprovalModal } from "./request-approval-modal";
import { enrollmentRequestService } from "@/services/api/enrollment-request.api";
import { ProductType, ApprovalStatus, productKey } from "@/types/enrollment-request";
import type { CatalogCourse } from "@/types/catalog";
import { useAuth } from "@/hooks/use-auth";
import { useCourseAccess } from "@/hooks/use-course-access";
import { useCatalog } from "@/hooks/use-catalog";

const ALL_IN_ONE_ID = "ALL_IN_ONE";
type Tab = "courses" | "bundles" | "mine";
type Open = { type: "course" | "bundle"; id: string } | null;

/** Reads/writes `?course=` / `?bundle=` / `?tab=` so details can be linked to (e.g. after login). */
function readLocation(): { open: Open; tab: Tab | null } {
    if (typeof window === "undefined") return { open: null, tab: null };
    const q = new URLSearchParams(window.location.search);
    const course = q.get("course");
    const bundle = q.get("bundle");
    const tab = q.get("tab");
    return {
        open: course ? { type: "course", id: course } : bundle ? { type: "bundle", id: bundle } : null,
        tab: tab === "courses" || tab === "bundles" || tab === "mine" ? tab : null,
    };
}
function writeLocation(open: Open, tab: Tab) {
    const q = new URLSearchParams();
    if (tab !== "courses") q.set("tab", tab);
    if (open) q.set(open.type, open.id);
    const qs = q.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
}

/**
 * Student "Buy Courses" store. Same catalog, cards, curriculum and details as
 * the public homepage; adds enrollment state, My Courses and approval requests.
 * Purchases go through the existing PaymentButton → Razorpay → server verification.
 */
export function CourseSellingPage() {
    const { user } = useAuth();
    // The signed-in user is only known in the browser; gate user-specific UI on mount so hydration matches.
    const mounted = useMounted();
    const isStudent = mounted && user?.role === "student";
    const access = useCourseAccess();
    const { catalog, loading, error, retry } = useCatalog();

    const [tab, setTab] = useState<Tab>("courses");
    const [open, setOpen] = useState<Open>(null);
    const [requestStatuses, setRequestStatuses] = useState<Map<string, ApprovalStatus>>(new Map());
    const [requestModal, setRequestModal] = useState<{ productType: ProductType; productId: string; productName: string } | null>(null);

    useEffect(() => {
        const loc = readLocation();
        if (loc.tab) setTab(loc.tab);
        if (loc.open) setOpen(loc.open);
    }, []);

    const show = useCallback((next: Open, nextTab: Tab = tab) => {
        setOpen(next);
        writeLocation(next, nextTab);
    }, [tab]);
    const switchTab = (t: Tab) => { setTab(t); writeLocation(open, t); };

    const loadMyRequests = useCallback(async () => {
        if (!isStudent) return;
        try {
            const reqs = await enrollmentRequestService.getMine();
            const map = new Map<string, ApprovalStatus>();
            for (const r of reqs) {
                const key = productKey(r.product_type, r.product_id);
                const prev = map.get(key);
                if (!prev || r.status === "PENDING" || (r.status === "APPROVED" && prev !== "PENDING")) map.set(key, r.status);
            }
            setRequestStatuses(map);
        } catch {
            // non-critical
        }
    }, [isStudent]);
    useEffect(() => { loadMyRequests(); }, [loadMyRequests, user?.id]);

    const renderRequestControl = (productType: ProductType, productId: string, productName: string) => {
        if (!isStudent) return null;
        const status = requestStatuses.get(productKey(productType, productId));
        if (status === "APPROVED") return null;
        if (status === "PENDING") {
            return (
                <span className="inline-flex items-center justify-center gap-1.5 w-full text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 rounded-xl">
                    <Clock className="w-4 h-4" /> Approval Pending
                </span>
            );
        }
        return (
            <button
                type="button"
                onClick={() => setRequestModal({ productType, productId, productName })}
                className="inline-flex items-center justify-center gap-1.5 w-full text-xs font-bold text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2.5 rounded-xl transition-all"
            >
                <ShieldCheck className="w-4 h-4" /> Request Admin Approval
            </button>
        );
    };

    const byId = useMemo(() => new Map((catalog?.courses ?? []).map(c => [c.id, c])), [catalog]);
    const myCourses = useMemo(
        () => (catalog?.courses ?? []).filter(c => access.hasCourse({ id: c.id, _id: c._id })),
        [catalog, access],
    );
    const openCourse = (c: CatalogCourse) => show({ type: "course", id: c.id });

    const tabs: { key: Tab; label: string; icon: typeof BookOpen; count?: number }[] = [
        { key: "courses", label: "All courses", icon: BookOpen, count: catalog?.courses.length },
        { key: "bundles", label: "Bundles", icon: Package, count: catalog ? catalog.bundles.length + (catalog.allAccess.price > 0 && catalog.courses.length ? 1 : 0) : undefined },
        ...(isStudent ? [{ key: "mine" as Tab, label: "My courses", icon: GraduationCap, count: access.ready ? myCourses.length : undefined }] : []),
    ];

    const openBundle = open?.type === "bundle" ? catalog?.bundles.find(b => b.id === open.id) : undefined;
    const openCourseName = open?.type === "course" ? byId.get(open.id)?.title : undefined;

    return (
        <MotionConfig reducedMotion="user">
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-clip">
                <SellingNavbar />

                {/* Header */}
                <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white">
                    <div className="hero-blob absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full bg-blue-600/20 blur-3xl pointer-events-none" aria-hidden="true" />
                    <div className="hero-blob hero-blob--slow absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" aria-hidden="true" />
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 sm:pt-16 sm:pb-28">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Course store</p>
                        <h1 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight leading-[1.08]">
                            {mounted && access.fullAccess ? "You have full access to every course" : "Find your next course"}
                        </h1>
                        <p className="mt-4 text-blue-100/80 text-base sm:text-lg max-w-2xl">
                            {mounted && access.fullAccess
                                ? "Everything below is already unlocked for you — open any course to start learning."
                                : "Browse every course and bundle, open the full curriculum, and enroll when you’re ready. Coupons can be applied at checkout."}
                        </p>
                        {catalog && catalog.stats.courses > 0 && (
                            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
                                {[
                                    { label: "Courses", value: catalog.stats.courses },
                                    { label: "Modules", value: catalog.stats.modules },
                                    { label: "Bundles", value: catalog.stats.bundles },
                                    ...(isStudent && access.ready ? [{ label: "You’re enrolled in", value: myCourses.length }] : []),
                                ].filter(s => s.value > 0 || s.label.startsWith("You")).map(s => (
                                    <div key={s.label}>
                                        <dt className="text-xs font-semibold text-blue-200/70">{s.label}</dt>
                                        <dd className="text-2xl font-black tabular-nums">{s.value.toLocaleString("en-IN")}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                        {mounted && access.fullAccess && (
                            <Link href="/student" className="mt-8 inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-black px-6 py-3 rounded-xl text-sm shadow-xl shadow-blue-950/30">
                                <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Continue learning
                            </Link>
                        )}
                    </div>
                </header>

                <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 pb-20">
                    {/* Tabs */}
                    <div role="tablist" aria-label="Store sections" className="inline-flex max-w-full overflow-x-auto scrollbar-hide gap-1 p-1.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl shadow-gray-900/5 mb-8">
                        {tabs.map(t => {
                            const on = t.key === tab;
                            return (
                                <button
                                    key={t.key}
                                    id={`store-tab-${t.key}`}
                                    role="tab"
                                    type="button"
                                    aria-selected={on}
                                    aria-controls={`store-panel-${t.key}`}
                                    onClick={() => switchTab(t.key)}
                                    className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${on ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                                >
                                    <t.icon className="w-4 h-4" aria-hidden="true" /> {t.label}
                                    {t.count !== undefined && <span className={`text-xs ${on ? "opacity-70" : "text-gray-400"}`}>{t.count}</span>}
                                </button>
                            );
                        })}
                    </div>

                    {error ? (
                        <ErrorState message="Failed to load courses. Please try again." onRetry={retry} />
                    ) : (
                        <>
                            <div id="store-panel-courses" role="tabpanel" aria-labelledby="store-tab-courses" hidden={tab !== "courses"}>
                                <CourseExplorer courses={catalog?.courses ?? []} categories={catalog?.categories ?? []} loading={loading} onOpenCourse={openCourse} />
                            </div>

                            <div id="store-panel-bundles" role="tabpanel" aria-labelledby="store-tab-bundles" hidden={tab !== "bundles"}>
                                {catalog && catalog.allAccess.price > 0 && catalog.courses.length > 0 && !access.fullAccess && (
                                    <div className="mb-8">
                                        <AllAccessCard
                                            price={catalog.allAccess.price}
                                            courseCount={catalog.allAccess.courseCount}
                                            secondary={access.ready ? renderRequestControl("ALL_IN_ONE", ALL_IN_ONE_ID, "freshkite Complete Course") : null}
                                        />
                                    </div>
                                )}
                                {loading ? null : catalog && catalog.bundles.length > 0 ? (
                                    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {catalog.bundles.map((b, i) => (
                                            <Reveal as="li" key={b.id} delay={(i % 3) * 0.06}>
                                                <CatalogBundleCard
                                                    bundle={b}
                                                    courses={bundleCourses(b, byId)}
                                                    onOpenBundle={bundle => show({ type: "bundle", id: bundle.id })}
                                                    secondary={access.ready ? renderRequestControl("BUNDLE", b.id, b.name) : null}
                                                />
                                            </Reveal>
                                        ))}
                                    </ul>
                                ) : (
                                    <EmptyState icon={<Package className="w-6 h-6" />} title="No bundles available yet." description="Check back soon or explore individual courses." />
                                )}
                            </div>

                            {isStudent && (
                                <div id="store-panel-mine" role="tabpanel" aria-labelledby="store-tab-mine" hidden={tab !== "mine"}>
                                    {!access.ready ? (
                                        <p className="text-sm text-gray-500" role="status">Checking your enrollments…</p>
                                    ) : myCourses.length ? (
                                        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                            {myCourses.map(c => <li key={c.id}><CatalogCourseCard course={c} onOpenCourse={openCourse} inBundle={false} /></li>)}
                                        </ul>
                                    ) : (
                                        <EmptyState
                                            icon={<GraduationCap className="w-6 h-6" />}
                                            title="You haven’t enrolled in a course yet"
                                            description="Courses you buy, get through a bundle or are given access to will appear here."
                                            action={<button type="button" onClick={() => switchTab("courses")} className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold">Browse courses</button>}
                                        />
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </main>

                <HomeFooter categories={catalog?.categories} />

                <Modal
                    open={!!open}
                    onClose={() => show(null)}
                    size="2xl"
                    title={open?.type === "bundle" ? (openBundle?.name ?? "Bundle details") : (openCourseName ?? "Course details")}
                    description={open?.type === "bundle" ? "Bundle details" : "Course details"}
                    bodyClassName="p-5 sm:p-7"
                >
                    {open?.type === "course" && (
                        <CourseDetailsLoader
                            key={open.id}
                            id={open.id}
                            variant="modal"
                            onOpenBundle={id => show({ type: "bundle", id })}
                        />
                    )}
                    {open?.type === "bundle" && (
                        <BundleDetailsLoader
                            key={open.id}
                            id={open.id}
                            variant="modal"
                            onOpenCourse={id => show({ type: "course", id })}
                            secondary={access.ready && openBundle ? renderRequestControl("BUNDLE", openBundle.id, openBundle.name) : null}
                        />
                    )}
                </Modal>

                {requestModal && (
                    <RequestApprovalModal
                        productType={requestModal.productType}
                        productId={requestModal.productId}
                        productName={requestModal.productName}
                        onClose={() => setRequestModal(null)}
                        onSubmitted={loadMyRequests}
                    />
                )}
            </div>
        </MotionConfig>
    );
}
