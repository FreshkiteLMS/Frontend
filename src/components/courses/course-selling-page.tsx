"use client";

import { useState, useEffect } from "react";
import { Loader2, Globe, Instagram, Twitter, BookOpen, Users, Award, Zap, Check, ChevronDown, ChevronUp, Play, Clock, BarChart, Star } from "lucide-react";
import { courseService } from "@/services/api/course.api";
import { courseGroupService } from "@/services/api/courseGroupService";
import { studentService } from "@/services/api/student.api";
import { configService, PublicConfig } from "@/services/api/config.api";
import { CourseCard } from "./course-card";
import { SellingNavbar } from "@/components/layout/selling-navbar";
import { CourseGroup, Course } from "@/types/course";
import PaymentButton from "../payment/PaymentButton";
import { RequestApprovalModal } from "./request-approval-modal";
import { enrollmentRequestService } from "@/services/api/enrollment-request.api";
import { ProductType, ApprovalStatus, productKey } from "@/types/enrollment-request";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";

const ALL_IN_ONE_ID = "ALL_IN_ONE";

function formatCurrency(amount: number, currency: string = "INR"): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function CategoryBadge({ category }: { category: string }) {
    const colors: Record<string, string> = {
        ai_ml: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
        web_development: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        data_science: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
        default: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    };
    const label = category.replace(/_/g, " ");
    return (
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${colors[category] || colors.default}`}>
            {label}
        </span>
    );
}

interface BundleCardProps {
    group: CourseGroup;
    isExpanded: boolean;
    isOwned: boolean;
    onToggle: () => void;
    requestControl: React.ReactNode;
    user: any;
}

function BundleCard({ group, isExpanded, isOwned, onToggle, requestControl, user }: BundleCardProps) {
    const courseCount = (group.courses || []).length;
    const previewCourses = (group.courses || []).slice(0, isExpanded ? undefined : 3);

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            {/* Header gradient */}
            <div className="relative h-36 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex flex-col justify-end p-5 overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                {(group as any).image_url ? (
                    <img
                        src={(group as any).image_url}
                        alt={group.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                ) : null}
                <div className="relative z-10">
                    <span className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mb-1 block">Bundle · {courseCount} Courses</span>
                    <h3 className="text-white font-black text-lg leading-tight line-clamp-2">{group.name}</h3>
                </div>
            </div>

            <div className="p-5 flex flex-col flex-1">
                {group.description && (
                    <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed mb-4 line-clamp-2">
                        {group.description}
                    </p>
                )}

                {/* Course list */}
                <div className="mb-4 space-y-1.5">
                    {previewCourses.map((ce: any, idx: number) => {
                        const sub = typeof ce.courseId === "object" ? ce.courseId : null;
                        return (
                            <div key={idx} className="flex items-center gap-2.5 py-1">
                                <div className="w-5 h-5 bg-blue-50 dark:bg-blue-900/30 rounded flex items-center justify-center shrink-0">
                                    <Play className="w-2.5 h-2.5 text-blue-500 fill-blue-500" />
                                </div>
                                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate">
                                    {sub?.title || ce.name || "Course"}
                                </span>
                            </div>
                        );
                    })}
                    {courseCount > 3 && (
                        <button
                            onClick={onToggle}
                            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 mt-1 transition-colors"
                        >
                            {isExpanded ? (
                                <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                            ) : (
                                <><ChevronDown className="w-3.5 h-3.5" /> +{courseCount - 3} more courses</>
                            )}
                        </button>
                    )}
                </div>

                {/* Price & Buy */}
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <span className="text-2xl font-black text-gray-900 dark:text-white">
                                ₹{(group.price || 0).toLocaleString()}
                            </span>
                        </div>
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-2.5 py-1 rounded-full">
                            Best Value
                        </span>
                    </div>
                    {isOwned ? (
                        <div className="w-full flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold text-sm py-2.5 rounded-xl border border-green-200 dark:border-green-800">
                            <Check className="w-4 h-4" /> Enrolled
                        </div>
                    ) : (
                        <PaymentButton
                            amount={(group.price || 0) * 100}
                            currency="INR"
                            courseId={(group as any)._id}
                            itemType="bundle"
                            userDetails={{ name: user?.name || "", email: user?.email || "", contact: "" }}
                            label="Enroll in Bundle"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center"
                        />
                    )}
                    {requestControl && <div className="mt-2">{requestControl}</div>}
                </div>
            </div>
        </div>
    );
}

export function CourseSellingPage() {
    const { user } = useAuth();
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
    const [individualCourses, setIndividualCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [ownedCourseIds, setOwnedCourseIds] = useState<Set<string>>(new Set());
    const [siteConfig, setSiteConfig] = useState<PublicConfig | null>(null);
    const [requestStatuses, setRequestStatuses] = useState<Map<string, ApprovalStatus>>(new Map());
    const [requestModal, setRequestModal] = useState<{ productType: ProductType; productId: string; productName: string } | null>(null);

    const isStudent = user?.role === "student";

    const loadMyRequests = async () => {
        if (user?.role !== "student") return;
        try {
            const reqs = await enrollmentRequestService.getMine();
            const map = new Map<string, ApprovalStatus>();
            for (const r of reqs) {
                const key = productKey(r.product_type, r.product_id);
                const prev = map.get(key);
                if (!prev || r.status === "PENDING" || (r.status === "APPROVED" && prev !== "PENDING")) {
                    map.set(key, r.status);
                }
            }
            setRequestStatuses(map);
        } catch {
            // non-critical
        }
    };

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);
                const [groups, courses, cfg] = await Promise.all([
                    courseGroupService.getGroupedCourses().catch(() => []),
                    courseService.getAllCourses({ status: 'active' }).catch(() => []),
                    configService.getPublicConfig().catch(() => null),
                ]);

                setCourseGroups(groups || []);
                setIndividualCourses(courses || []);
                setSiteConfig(cfg);

                if (user?.role === "student" && user.id) {
                    try {
                        const studentData = await studentService.getStudentCourses(user.id);
                        if (studentData && Array.isArray(studentData.courses)) {
                            const owned = new Set<string>(
                                studentData.courses.flatMap((c: any) => [c.id, c._id].filter(Boolean))
                            );
                            setOwnedCourseIds(owned);
                        }
                    } catch {
                        // Non-critical
                    }
                    await loadMyRequests();
                }

                setError(null);
            } catch {
                setError("Failed to load courses. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [user]);

    const filteredCourses = individualCourses.filter(
        (c) => categoryFilter === "All" || c.category === categoryFilter
    );

    const categories = [
        "All",
        ...Array.from(new Set(individualCourses.map((c) => c.category).filter(Boolean) as string[])),
    ];
    const totalCourses = siteConfig?.totalCourseCount ?? individualCourses.length;
    const subscriptionPrice = siteConfig?.subscriptionPrice ?? 60000;
    const currency = siteConfig?.currency ?? "INR";
    const formattedPrice = formatCurrency(subscriptionPrice, currency);

    const renderRequestControl = (
        productType: ProductType,
        productId: string,
        productName: string,
        variant: "hero" | "card" = "card"
    ) => {
        if (!isStudent) return null;
        const status = requestStatuses.get(productKey(productType, productId));
        if (status === "APPROVED") return null;

        if (status === "PENDING") {
            return (
                <span className={
                    variant === "hero"
                        ? "inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white font-bold px-6 py-3.5 rounded-xl text-sm"
                        : "inline-flex items-center justify-center gap-1.5 w-full text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 rounded-xl"
                }>
                    <Clock className="w-4 h-4" /> Approval Pending
                </span>
            );
        }

        return (
            <button
                onClick={() => setRequestModal({ productType, productId, productName })}
                className={
                    variant === "hero"
                        ? "inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/30 hover:bg-white/20 font-bold px-6 py-3.5 rounded-xl text-sm transition-all"
                        : "inline-flex items-center justify-center gap-1.5 w-full text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2.5 rounded-xl transition-all"
                }
            >
                <ShieldCheck className="w-4 h-4" /> Request Admin Approval
            </button>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 gap-4">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading courses…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 gap-4">
                <p className="text-red-600 font-semibold">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <SellingNavbar />

            {/* Hero — freshkite Complete Course */}
            <div className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 overflow-hidden">
                {/* Subtle grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='g' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='white' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3C/svg%3E")`,
                    }}
                />
                <div className="absolute top-0 right-0 w-[900px] h-[900px] bg-blue-600/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl pointer-events-none" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
                    <div className="grid lg:grid-cols-[1fr_400px] gap-16 items-center">
                        {/* Left content */}
                        <div>
                            <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-400/25 rounded-full px-4 py-2 mb-8">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                                <span className="text-blue-300 text-[11px] font-bold uppercase tracking-[0.15em]">Limited Time Offer</span>
                            </div>

                            {/* freshkite wordmark */}
                            <div className="mb-2">
                                <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">fresh</span>
                                <span className="text-5xl sm:text-6xl font-black text-blue-400 tracking-tight">kite</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-[1.1] tracking-tight">
                                Complete Course
                            </h1>

                            <p className="text-blue-100/80 text-lg mb-8 leading-relaxed max-w-lg">
                                Unlock {totalCourses}+ industry-grade courses, live mentorship from 20-year veterans, and dedicated placement support — all in one package.
                            </p>

                            {/* Features */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
                                {[
                                    "Lifetime access to all courses",
                                    "Live 1-on-1 mentorship sessions",
                                    "Career placement support",
                                    "Certificate of completion",
                                    "Project-based learning",
                                    "Dedicated community access",
                                ].map((f) => (
                                    <div key={f} className="flex items-center gap-3">
                                        <div className="w-5 h-5 bg-blue-500/20 border border-blue-400/30 rounded-full flex items-center justify-center shrink-0">
                                            <Check className="w-3 h-3 text-blue-300" />
                                        </div>
                                        <span className="text-blue-100/90 text-sm">{f}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="flex flex-col">
                                    <span className="text-blue-300/60 text-xs font-medium line-through">{formatCurrency(subscriptionPrice * 1.5, currency)}</span>
                                    <span className="text-white text-3xl font-black">{formattedPrice}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <PaymentButton
                                        amount={subscriptionPrice * 100}
                                        currency={currency}
                                        courseId="master-subscription"
                                        itemType="bundle"
                                        userDetails={{ name: user?.name || "", email: user?.email || "", contact: "" }}
                                        label="Enroll Now — Get Full Access"
                                        className="bg-white text-blue-700 hover:bg-blue-50 font-black px-8 py-3.5 rounded-xl text-sm transition-all shadow-xl shadow-blue-900/30 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
                                    />
                                    {renderRequestControl("ALL_IN_ONE", ALL_IN_ONE_ID, "freshkite Complete Course", "hero")}
                                </div>
                            </div>
                        </div>

                        {/* Right — package card */}
                        <div className="hidden lg:block">
                            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl">
                                {/* Logo */}
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                        <span className="text-white font-black text-sm tracking-tight">FK</span>
                                    </div>
                                    <div>
                                        <div className="text-white font-black text-base leading-none">
                                            fresh<span className="text-blue-400">kite</span>
                                        </div>
                                        <div className="text-blue-300/60 text-[10px] font-semibold uppercase tracking-wider mt-0.5">Complete Course</div>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-8">
                                    {[
                                        { label: "Courses", value: `${totalCourses}+`, icon: BookOpen },
                                        { label: "Access Duration", value: "Lifetime", icon: Zap },
                                        { label: "Mentor Sessions", value: "Included", icon: Users },
                                        { label: "Certificate", value: "Yes", icon: Award },
                                    ].map(({ label, value, icon: Icon }) => (
                                        <div key={label} className="flex items-center justify-between py-3 border-b border-white/10">
                                            <div className="flex items-center gap-2.5">
                                                <Icon className="w-4 h-4 text-blue-400" />
                                                <span className="text-blue-100/70 text-sm">{label}</span>
                                            </div>
                                            <span className="text-white font-bold text-sm">{value}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-blue-500/10 border border-blue-400/20 rounded-2xl p-5 text-center">
                                    <div className="text-blue-300/70 text-xs font-semibold uppercase tracking-widest mb-1">Total Investment</div>
                                    <div className="text-4xl font-black text-white mb-1">{formattedPrice}</div>
                                    <div className="text-blue-300/50 text-xs">One-time · No recurring fees</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats bar */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800">
                        {[
                            { icon: BookOpen, value: `${totalCourses}+`, label: "Courses" },
                            { icon: Users, value: "500+", label: "Students Enrolled" },
                            { icon: Award, value: "57 LPA", label: "Top Package Placed" },
                            { icon: Star, value: "4.9/5", label: "Avg Rating" },
                        ].map(({ icon: Icon, value, label }) => (
                            <div key={label} className="flex items-center gap-4 px-6 py-5">
                                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <div className="text-xl font-black text-gray-900 dark:text-white leading-none">{value}</div>
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Professional Bundles */}
            <div id="professional-bundles" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="mb-10">
                    <p className="text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-[0.15em] mb-2">Learning Tracks</p>
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 dark:text-white">Professional Bundles</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Curated course packages designed for career transformation</p>
                        </div>
                    </div>
                </div>

                {courseGroups.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 py-20 text-center">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="text-gray-400 dark:text-gray-500 font-medium">No bundles available yet.</p>
                        <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">Check back soon or explore individual courses below.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courseGroups.map((group) => {
                            const isExpanded = expandedGroups.has(group._id);
                            return (
                                <BundleCard
                                    key={group._id}
                                    group={group}
                                    isExpanded={isExpanded}
                                    isOwned={group.courses.some((ce: any) =>
                                        ownedCourseIds.has(ce.courseId?.id || ce.courseId?.toString() || ce.courseId)
                                    )}
                                    onToggle={() => {
                                        const next = new Set(expandedGroups);
                                        if (isExpanded) next.delete(group._id);
                                        else next.add(group._id);
                                        setExpandedGroups(next);
                                    }}
                                    requestControl={renderRequestControl("BUNDLE", group._id, group.name)}
                                    user={user}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Individual Courses */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-gray-100 dark:border-gray-800">
                <div className="mb-10">
                    <p className="text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-[0.15em] mb-2">À la carte</p>
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 dark:text-white">Individual Courses</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Focused, project-based courses for specific skill development</p>
                        </div>
                        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-x-auto shrink-0">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                                        categoryFilter === cat
                                            ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                    }`}
                                >
                                    {cat === "All" ? cat : cat.replace(/_/g, " ")}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {filteredCourses.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 py-16 text-center">
                        <p className="text-gray-400 font-medium">No courses match the selected category.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCourses.map((course) => (
                            <CourseCard
                                key={(course as any)._id || course.id}
                                course={course}
                                isOwned={
                                    ownedCourseIds.has((course as any)._id) ||
                                    ownedCourseIds.has(course.id || "")
                                }
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 pt-16 pb-10 mt-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
                        <div>
                            <Link href="/" className="flex items-center gap-2.5 mb-5">
                                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30">
                                    <span className="text-white font-black text-xs">FK</span>
                                </div>
                                <div>
                                    <span className="text-gray-900 dark:text-white font-black text-base tracking-tight leading-none">
                                        fresh<span className="text-blue-600">kite</span>
                                    </span>
                                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-widest mt-0.5">Earn while you learn</p>
                                </div>
                            </Link>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                Expert-led tech education with proven placements at top companies.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-black text-gray-900 dark:text-white text-xs uppercase tracking-widest mb-5">Resources</h4>
                            <ul className="space-y-3">
                                {["Help Center", "Become Instructor", "Course Catalog"].map((l) => (
                                    <li key={l}>
                                        <Link href="#" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium transition-colors">
                                            {l}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-black text-gray-900 dark:text-white text-xs uppercase tracking-widest mb-5">Company</h4>
                            <ul className="space-y-3">
                                {["About Us", "Careers", "Blog"].map((l) => (
                                    <li key={l}>
                                        <Link href="#" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium transition-colors">
                                            {l}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-black text-gray-900 dark:text-white text-xs uppercase tracking-widest mb-5">Follow Us</h4>
                            <div className="flex items-center gap-3">
                                {[Globe, Instagram, Twitter].map((Icon, i) => (
                                    <button
                                        key={i}
                                        className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:bg-blue-600 hover:border-blue-600 transition-all duration-200"
                                    >
                                        <Icon className="w-4 h-4" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-gray-400 text-xs font-medium">
                            © {new Date().getFullYear()} Freshkite Learning Inc. All rights reserved.
                        </p>
                        <div className="flex items-center gap-4">
                            {["Privacy Policy", "Terms of Service"].map((l) => (
                                <Link key={l} href="#" className="text-gray-400 hover:text-blue-600 text-xs font-medium transition-colors">
                                    {l}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>

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
    );
}
