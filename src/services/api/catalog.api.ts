import api from './axios';
import type { Catalog, CatalogBundleDetail, CatalogCourseDetail } from '@/types/catalog';

/** Public catalog endpoints — work signed out; same data for every visitor. */
export const catalogService = {
    getCatalog: async (): Promise<Catalog> => (await api.get('/catalog')).data.data,
    getCourse: async (id: string): Promise<CatalogCourseDetail> =>
        (await api.get(`/catalog/courses/${encodeURIComponent(id)}`)).data.data,
    getBundle: async (id: string): Promise<CatalogBundleDetail> =>
        (await api.get(`/catalog/bundles/${encodeURIComponent(id)}`)).data.data,
};
