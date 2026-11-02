"use client";

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BookOpen, Crown, Layers, Loader2, Percent, IndianRupee, Search, Shuffle, TicketPercent } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { CouponPreview } from './coupon-preview';
import { previewDiscount, formatPaise } from '@/lib/money';
import {
    discountService,
    apiErrorMessage,
    apiFieldErrors,
    type AdminDiscount,
    type DiscountInput,
    type DiscountProduct,
    type DiscountType,
} from '@/services/api/discount.api';

type Products = { masterPlan: DiscountProduct; bundles: DiscountProduct[]; courses: DiscountProduct[] };
type Scope = 'ALL_IN_ONE' | 'BUNDLE' | 'COURSE';

/** Product key: 'ALL_IN_ONE' | 'BUNDLE:<bundle _id>' | 'COURSE:<Course.id>'. */
export const productKey = (scope: Scope, id?: string | null) => (scope === 'ALL_IN_ONE' ? 'ALL_IN_ONE' : id ? `${scope}:${id}` : '');
const parseKey = (key: string): { scope: Scope; id: string } | null => {
    if (key === 'ALL_IN_ONE') return { scope: 'ALL_IN_ONE', id: 'ALL_IN_ONE' };
    const m = /^(BUNDLE|COURSE):(.+)$/.exec(key);
    return m ? { scope: m[1] as Scope, id: m[2] } : null;
};

interface FormState {
    name: string;
    code: string;
    description: string;
    discount_type: DiscountType;
    value: string;
    product: string; // productKey(...) or ''
    is_active: boolean;
    starts_at: string; // datetime-local
    expires_at: string;
    max_usage: string;
    max_usage_per_student: string;
}

const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

/** ISO → value for <input type="datetime-local"> in the admin's local time. */
const toLocalInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

const fromDiscount = (d: AdminDiscount | null): FormState => ({
    name: d?.name ?? '',
    code: d?.code ?? '',
    description: d?.description ?? '',
    discount_type: d?.discount_type ?? 'percentage',
    value: d ? String(d.value) : '',
    product: d ? productKey(d.applicable_to, d.applicable_to === 'COURSE' ? d.course_id : d.bundle_id) : '',
    is_active: d?.is_active ?? true,
    starts_at: toLocalInput(d?.starts_at ?? null),
    expires_at: toLocalInput(d?.expires_at ?? null),
    max_usage: d?.max_usage != null ? String(d.max_usage) : '',
    max_usage_per_student: d?.max_usage_per_student != null ? String(d.max_usage_per_student) : '',
});

function randomCode(prefix: string) {
    const base = prefix.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) || 'SAVE';
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let tail = '';
    for (let i = 0; i < 4; i++) tail += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `${base}${tail}`;
}

export function DiscountForm({
    open,
    discount,
    initialProduct,
    onClose,
    onSaved,
}: {
    open: boolean;
    discount: AdminDiscount | null;
    /** Pre-select a product for a new coupon (productKey format). */
    initialProduct?: string | null;
    onClose: () => void;
    onSaved: (d: AdminDiscount) => void;
}) {
    const editing = !!discount;
    const [form, setForm] = useState<FormState>(() => fromDiscount(discount));
    const [products, setProducts] = useState<Products | null>(null);
    const [productsError, setProductsError] = useState<string | null>(null);
    const [scope, setScope] = useState<Scope>('BUNDLE');
    const [productQuery, setProductQuery] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        const initial = fromDiscount(discount);
        if (!discount && initialProduct && parseKey(initialProduct)) initial.product = initialProduct;
        setForm(initial);
        setScope(parseKey(initial.product)?.scope ?? 'BUNDLE');
        setErrors({});
        setTouched(false);
        setProductQuery('');
    }, [open, discount, initialProduct]);

    useEffect(() => {
        if (!open || products) return;
        discountService.products()
            .then(setProducts)
            .catch((err) => setProductsError(apiErrorMessage(err, 'Could not load products')));
    }, [open, products]);

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((f) => ({ ...f, [key]: value }));
        if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: '' }));
    };

    const selected: DiscountProduct | null = useMemo(() => {
        const key = parseKey(form.product);
        if (!products || !key) return null;
        if (key.scope === 'ALL_IN_ONE') return products.masterPlan;
        const list = key.scope === 'COURSE' ? products.courses : products.bundles;
        return list.find((p) => p.id === key.id) ?? null;
    }, [products, form.product]);

    const filteredProducts = useMemo(() => {
        const q = productQuery.trim().toLowerCase();
        const list = scope === 'COURSE' ? products?.courses ?? [] : scope === 'BUNDLE' ? products?.bundles ?? [] : [];
        return list.filter((p) => !q || p.name.toLowerCase().includes(q));
    }, [products, productQuery, scope]);

    const value = Number(form.value);

    /** Same rules the server enforces, for immediate feedback. */
    const validate = (): Record<string, string> => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Give the discount a name.';
        const code = form.code.trim().toUpperCase();
        if (!CODE_RE.test(code)) e.code = '3–32 characters: letters, digits, “-” or “_”.';
        if (!form.value || !Number.isFinite(value) || value <= 0) e.value = 'Enter a discount value.';
        else if (Math.round(value * 100) !== value * 100) e.value = 'Use at most 2 decimal places.';
        else if (form.discount_type === 'percentage' && (value < 1 || value > 99)) e.value = 'Percentage must be between 1 and 99.';
        if (!form.product) e.product = 'Choose what this coupon applies to.';
        else if (selected && selected.price < 100) e.product = `${selected.name} has no price set, so it can’t be discounted.`;
        if (selected && !e.value && !e.product && previewDiscount(form.discount_type, value, selected.price).belowMinimum) {
            e.value = `Must leave at least ₹1 to pay (price is ${formatPaise(selected.price)}).`;
        }
        if (form.starts_at && form.expires_at && new Date(form.expires_at) <= new Date(form.starts_at)) e.expires_at = 'Expiry must be after the start.';
        if (!editing && form.expires_at && new Date(form.expires_at) <= new Date()) e.expires_at = 'Expiry is in the past.';
        const intOrEmpty = (v: string) => v === '' || (/^\d+$/.test(v) && Number(v) >= 1);
        if (!intOrEmpty(form.max_usage)) e.max_usage = 'Whole number, 1 or more (or leave empty).';
        if (!intOrEmpty(form.max_usage_per_student)) e.max_usage_per_student = 'Whole number, 1 or more (or leave empty).';
        if (!e.max_usage && !e.max_usage_per_student && form.max_usage && form.max_usage_per_student && Number(form.max_usage_per_student) > Number(form.max_usage)) {
            e.max_usage_per_student = 'Can’t exceed the total limit.';
        }
        if (editing && discount && form.max_usage && Number(form.max_usage) < discount.usage_count) {
            e.max_usage = `Already used ${discount.usage_count} time(s).`;
        }
        return e;
    };

    const liveErrors = touched ? validate() : {};
    const shownErrors = { ...liveErrors, ...Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) };

    const submit = async (ev?: React.FormEvent) => {
        ev?.preventDefault();
        setTouched(true);
        const e = validate();
        if (Object.keys(e).length) {
            setErrors(e);
            return;
        }
        const target = parseKey(form.product)!;
        const payload: DiscountInput = {
            name: form.name.trim(),
            code: form.code.trim().toUpperCase(),
            description: form.description.trim(),
            discount_type: form.discount_type,
            value,
            applicable_to: target.scope,
            bundle_id: target.scope === 'BUNDLE' ? target.id : null,
            course_id: target.scope === 'COURSE' ? target.id : null,
            is_active: form.is_active,
            starts_at: fromLocalInput(form.starts_at),
            expires_at: fromLocalInput(form.expires_at),
            max_usage: form.max_usage ? Number(form.max_usage) : null,
            max_usage_per_student: form.max_usage_per_student ? Number(form.max_usage_per_student) : null,
        };
        setSaving(true);
        try {
            const saved = editing ? await discountService.update(discount!._id, payload) : await discountService.create(payload);
            toast.success(editing ? 'Discount updated' : `Coupon ${saved.code} created`);
            onSaved(saved);
        } catch (err) {
            const fields = apiFieldErrors(err);
            if (fields.bundle_id || fields.course_id) fields.product = fields.bundle_id || fields.course_id;
            setErrors(fields);
            if (!Object.keys(fields).length) toast.error(apiErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const inputClass = (field: string) =>
        `w-full rounded-xl border bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none transition focus:ring-2 ${shownErrors[field] ? 'border-red-300 dark:border-red-700 focus:ring-red-500/30' : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/30 focus:border-blue-500'}`;
    const FieldError = ({ field }: { field: string }) =>
        shownErrors[field] ? <p id={`df-${field}-err`} className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{shownErrors[field]}</p> : null;
    const label = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5';

    return (
        <Modal
            open={open}
            onClose={saving ? () => undefined : onClose}
            title={editing ? `Edit ${discount!.code}` : 'Create discount'}
            description={editing ? 'Changes apply to future checkouts. Past payments keep the discount they received.' : 'Set up a coupon for one course, one bundle or the Master Plan.'}
            size="2xl"
            closeOnBackdrop={false}
            icon={
                <span className="flex w-9 h-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <TicketPercent className="w-5 h-5" aria-hidden="true" />
                </span>
            }
            footer={
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={form.is_active}
                            onClick={() => set('is_active', !form.is_active)}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${form.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{form.is_active ? 'Active' : 'Inactive'}</span>
                    </label>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} disabled={saving} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-60">
                            Cancel
                        </button>
                        <button type="submit" form="discount-form" disabled={saving} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                            {editing ? 'Save changes' : 'Create discount'}
                        </button>
                    </div>
                </div>
            }
        >
            <form id="discount-form" onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_300px]">
                <div className="space-y-5 min-w-0">
                    {/* Identity */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="df-name" className={label}>Discount name</label>
                            <input id="df-name" data-autofocus value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Java launch offer" maxLength={120} aria-invalid={!!shownErrors.name} aria-describedby={shownErrors.name ? 'df-name-err' : undefined} className={inputClass('name')} />
                            <FieldError field="name" />
                        </div>
                        <div>
                            <label htmlFor="df-code" className={label}>Coupon code</label>
                            <div className="flex gap-2">
                                <input
                                    id="df-code"
                                    value={form.code}
                                    onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s+/g, ''))}
                                    placeholder="JAVA20"
                                    maxLength={32}
                                    autoComplete="off"
                                    spellCheck={false}
                                    aria-invalid={!!shownErrors.code}
                                    aria-describedby={shownErrors.code ? 'df-code-err' : undefined}
                                    className={`${inputClass('code')} font-mono tracking-wider`}
                                />
                                <button type="button" onClick={() => set('code', randomCode(form.name))} title="Generate a code" aria-label="Generate a code" className="shrink-0 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                                    <Shuffle className="w-4 h-4" />
                                </button>
                            </div>
                            <FieldError field="code" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="df-desc" className={label}>Description <span className="font-normal text-gray-400">(optional)</span></label>
                        <textarea id="df-desc" value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} maxLength={500} placeholder="Internal note or what students should know" className={`${inputClass('description')} resize-none`} />
                    </div>

                    {/* Type + value */}
                    <fieldset>
                        <legend className={label}>Discount</legend>
                        <div className="grid gap-3 sm:grid-cols-[auto_1fr] items-start">
                            <div role="radiogroup" aria-label="Discount type" className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800/60">
                                {([['percentage', 'Percentage', Percent], ['fixed', 'Fixed amount', IndianRupee]] as const).map(([t, text, Icon]) => (
                                    <button
                                        key={t}
                                        type="button"
                                        role="radio"
                                        aria-checked={form.discount_type === t}
                                        onClick={() => set('discount_type', t)}
                                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${form.discount_type === t ? 'bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                                    >
                                        <Icon className="w-4 h-4" aria-hidden="true" /> {text}
                                    </button>
                                ))}
                            </div>
                            <div>
                                <div className="relative">
                                    {form.discount_type === 'fixed' && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400" aria-hidden="true">₹</span>}
                                    <input
                                        id="df-value"
                                        aria-label={form.discount_type === 'percentage' ? 'Percentage off' : 'Amount off in rupees'}
                                        inputMode="decimal"
                                        value={form.value}
                                        onChange={(e) => set('value', e.target.value.replace(/[^\d.]/g, ''))}
                                        placeholder={form.discount_type === 'percentage' ? '20' : '500'}
                                        aria-invalid={!!shownErrors.value}
                                        aria-describedby={shownErrors.value ? 'df-value-err' : undefined}
                                        className={`${inputClass('value')} ${form.discount_type === 'fixed' ? 'pl-8' : 'pr-9'} tabular-nums`}
                                    />
                                    {form.discount_type === 'percentage' && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400" aria-hidden="true">%</span>}
                                </div>
                                <FieldError field="value" />
                            </div>
                        </div>
                    </fieldset>

                    {/* Product */}
                    <fieldset>
                        <legend className={label}>Applies to</legend>
                        {productsError ? (
                            <p className="text-sm text-red-600 dark:text-red-400">{productsError}</p>
                        ) : !products ? (
                            <div className="space-y-2" aria-busy="true">
                                {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Product type */}
                                <div role="tablist" aria-label="Product type" className="grid grid-cols-3 gap-1 rounded-xl border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800/60">
                                    {([
                                        ['ALL_IN_ONE', 'Master Plan', Crown],
                                        ['BUNDLE', `Bundles (${products.bundles.length})`, Layers],
                                        ['COURSE', `Courses (${products.courses.length})`, BookOpen],
                                    ] as const).map(([s, text, Icon]) => (
                                        <button
                                            key={s}
                                            type="button"
                                            role="tab"
                                            aria-selected={scope === s}
                                            onClick={() => {
                                                setScope(s);
                                                setProductQuery('');
                                                if (s === 'ALL_IN_ONE') set('product', 'ALL_IN_ONE');
                                            }}
                                            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs sm:text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${scope === s ? 'bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                                        >
                                            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" /> <span className="truncate">{text}</span>
                                        </button>
                                    ))}
                                </div>

                                {scope === 'ALL_IN_ONE' ? (
                                    <div role="radiogroup" aria-label="Master Plan">
                                        <ProductOption
                                            checked={form.product === 'ALL_IN_ONE'}
                                            onSelect={() => set('product', 'ALL_IN_ONE')}
                                            icon={<Crown className="w-4 h-4" />}
                                            tone="amber"
                                            title="Master Plan"
                                            subtitle="Full access to every course"
                                            price={products.masterPlan.price}
                                        />
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
                                            <Search className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
                                            <input
                                                value={productQuery}
                                                onChange={(e) => setProductQuery(e.target.value)}
                                                placeholder={scope === 'COURSE' ? `Search ${products.courses.length} courses` : `Search ${products.bundles.length} bundles`}
                                                aria-label={scope === 'COURSE' ? 'Search courses' : 'Search bundles'}
                                                className="w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none py-1"
                                            />
                                        </div>
                                        <div role="radiogroup" aria-label={scope === 'COURSE' ? 'Courses' : 'Bundles'} aria-invalid={!!shownErrors.product} className="max-h-52 overflow-y-auto p-1.5 space-y-1">
                                            {filteredProducts.length === 0 ? (
                                                <p className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                                    {productQuery ? 'Nothing matches.' : scope === 'COURSE' ? 'No courses yet.' : 'No bundles yet — create one first.'}
                                                </p>
                                            ) : filteredProducts.map((p) => {
                                                const key = productKey(scope, p.id);
                                                return (
                                                    <ProductOption
                                                        key={key}
                                                        compact
                                                        checked={form.product === key}
                                                        onSelect={() => set('product', key)}
                                                        icon={scope === 'COURSE' ? <BookOpen className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                                                        tone={scope === 'COURSE' ? 'emerald' : 'blue'}
                                                        title={p.name}
                                                        subtitle={p.status === 'inactive' ? (scope === 'COURSE' ? 'Draft — not on sale yet' : 'Unpublished') : scope === 'COURSE' ? 'Course' : 'Bundle'}
                                                        price={p.price}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {selected && scope !== parseKey(form.product)?.scope && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Currently selected: <strong className="text-gray-700 dark:text-gray-300">{selected.name}</strong></p>
                                )}
                            </div>
                        )}
                        <FieldError field="product" />
                    </fieldset>

                    {/* Schedule + limits */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="df-start" className={label}>Starts <span className="font-normal text-gray-400">(optional)</span></label>
                            <input id="df-start" type="datetime-local" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} className={inputClass('starts_at')} />
                            <FieldError field="starts_at" />
                        </div>
                        <div>
                            <label htmlFor="df-end" className={label}>Expires <span className="font-normal text-gray-400">(optional)</span></label>
                            <input id="df-end" type="datetime-local" value={form.expires_at} onChange={(e) => set('expires_at', e.target.value)} aria-invalid={!!shownErrors.expires_at} className={inputClass('expires_at')} />
                            <FieldError field="expires_at" />
                        </div>
                        <div>
                            <label htmlFor="df-max" className={label}>Total uses <span className="font-normal text-gray-400">(optional)</span></label>
                            <input id="df-max" inputMode="numeric" value={form.max_usage} onChange={(e) => set('max_usage', e.target.value.replace(/\D/g, ''))} placeholder="Unlimited" aria-invalid={!!shownErrors.max_usage} className={inputClass('max_usage')} />
                            <FieldError field="max_usage" />
                        </div>
                        <div>
                            <label htmlFor="df-max-student" className={label}>Uses per student <span className="font-normal text-gray-400">(optional)</span></label>
                            <input id="df-max-student" inputMode="numeric" value={form.max_usage_per_student} onChange={(e) => set('max_usage_per_student', e.target.value.replace(/\D/g, ''))} placeholder="Unlimited" aria-invalid={!!shownErrors.max_usage_per_student} className={inputClass('max_usage_per_student')} />
                            <FieldError field="max_usage_per_student" />
                        </div>
                    </div>
                </div>

                <aside className="lg:sticky lg:top-0 self-start">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Live preview</p>
                    <CouponPreview
                        code={form.code.trim().toUpperCase()}
                        name={form.name.trim()}
                        type={form.discount_type}
                        value={value}
                        productName={selected?.name ?? null}
                        originalPaise={selected?.price ?? null}
                        expiresAt={fromLocalInput(form.expires_at)}
                    />
                    {editing && discount && discount.usage_count > 0 && (
                        <p className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                            Used {discount.usage_count} time(s). Those payments keep the discount they received.
                        </p>
                    )}
                </aside>
            </form>
        </Modal>
    );
}

function ProductOption({
    checked,
    onSelect,
    icon,
    tone,
    title,
    subtitle,
    price,
    compact = false,
}: {
    checked: boolean;
    onSelect: () => void;
    icon: React.ReactNode;
    tone: 'amber' | 'blue' | 'emerald';
    title: string;
    subtitle: string;
    price: number;
    compact?: boolean;
}) {
    const toneClass = tone === 'amber'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : tone === 'emerald'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    const stateClass = checked
        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/20'
        : `${compact ? 'border-transparent' : 'border-gray-200 dark:border-gray-700'} hover:bg-gray-50 dark:hover:bg-gray-800/60`;
    return (
        <button
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={onSelect}
            className={`w-full flex items-center gap-3 text-left rounded-xl border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'} ${stateClass}`}
        >
            <span className={`flex w-8 h-8 shrink-0 items-center justify-center rounded-lg ${toneClass}`} aria-hidden="true">{icon}</span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">{title}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{subtitle}</span>
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300">{formatPaise(price)}</span>
            <span className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${checked ? 'border-blue-600' : 'border-gray-300 dark:border-gray-600'}`} aria-hidden="true">
                {checked && <span className="w-2 h-2 rounded-full bg-blue-600" />}
            </span>
        </button>
    );
}
