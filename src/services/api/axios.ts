
import axios from 'axios';
import { env } from '@/config/env';

const api = axios.create({
    baseURL: env.API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
    (config) => {
        // We use localStorage for client-side API calls to maintain compatibility
        // with value reading in Client Components.
        // Middleware will use cookies for route protection.
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Flag to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized globally
        // Skip auto-refresh for auth endpoints — their 401s are credential errors, not expired tokens
        const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
            originalRequest.url?.includes('/auth/signup') ||
            originalRequest.url?.includes('/auth/register') ||
            originalRequest.url?.includes('/auth/refresh') ||
            originalRequest.url?.includes('/auth/google-login');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            console.warn('[Axios] 401 Unauthorized detected. Attempting silent refresh...');

            if (isRefreshing) {
                console.log('[Axios] Refresh already in progress, queuing request...');
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

            if (refreshToken) {
                try {
                    console.log('[Axios] Calling refresh token endpoint...');
                    // We import authService dynamically to avoid circular dependency
                    const { authService } = await import('./auth.api');
                    const refreshResponse = await authService.refreshToken(refreshToken);

                    if (refreshResponse.success && refreshResponse.token) {
                        console.log('[Axios] Refresh successful! Retrying original request.');
                        processQueue(null, refreshResponse.token);
                        originalRequest.headers.Authorization = `Bearer ${refreshResponse.token}`;
                        return api(originalRequest);
                    }
                } catch (refreshError) {
                    console.error('[Axios] Refresh token failed:', refreshError);
                    processQueue(refreshError, null);
                    // If refresh fails, log out the user
                    const { authService } = await import('./auth.api');
                    authService.logout();
                    if (typeof window !== 'undefined') window.location.href = '/login';
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }

            console.error('[Axios] No refresh token available. Redirecting to login.');
            // No refresh token or refresh failed
            if (typeof window !== 'undefined') {
                const { authService } = await import('./auth.api');
                authService.logout();
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
