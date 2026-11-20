import { env } from '@/config/env';
import type { Catalog, CatalogBundleDetail, CatalogCourseDetail } from '@/types/catalog';

/**
 * Server-side catalog reads for server-rendered pages (SEO). Revalidated every
 * 60 s, matching the API's own cache. Never throws: when the API can't be
 * reached the page still renders and the client fetches instead.
 * `notFound` is only true for a real 404 (unpublished/unknown), never for an outage.
 */
export interface ServerRead<T> { data: T | null; notFound: boolean }

async function read<T>(path: string): Promise<ServerRead<T>> {
    try {
        const res = await fetch(`${env.API_URL}${path}`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) });
        if (res.status === 404) return { data: null, notFound: true };
        if (!res.ok) return { data: null, notFound: false };
        const body = await res.json();
        return { data: (body?.data ?? null) as T | null, notFound: false };
    } catch {
        return { data: null, notFound: false };
    }
}

export const getCatalogServer = async () => (await read<Catalog>('/catalog')).data;
export const getCourseServer = (id: string) => read<CatalogCourseDetail>(`/catalog/courses/${encodeURIComponent(id)}`);
export const getBundleServer = (id: string) => read<CatalogBundleDetail>(`/catalog/bundles/${encodeURIComponent(id)}`);
