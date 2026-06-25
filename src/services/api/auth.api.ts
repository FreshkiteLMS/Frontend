
import api from './axios';
import { LoginResponse } from '@/types/auth'; // You'll need to create this in src/types/auth.ts
import Cookies from 'js-cookie';
import { env } from '@/config/env';

export const authService = {
    signup: async (data: { username: string; firstName: string; lastName?: string; email: string; password: string }): Promise<any> => {
        try {
            const payload = {
                firstName: data.firstName,
                lastName: data.lastName,
                username: data.username,
                email: data.email,
                password: data.password,
                role: 'student'
            };

            const response = await api.post('/auth/signup', payload);

            if (response.data.success) {
                return {
                    success: true,
                    message: response.data.message
                };
            }
            return {
                success: false,
                error: response.data.message || 'Signup failed'
            };
        } catch (error: any) {
            console.error('Signup error:', error);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message || 'Signup failed'
            };
        }
    },
    login: async (username: string, password: string): Promise<LoginResponse> => {
        try {
            const response = await api.post('/auth/login', { username, password });

            if (response.data.success) {
                const { token, refreshToken, user } = response.data.data;
                console.log("[Auth API] Raw user data from DB before saving:", user);

                // Save to localStorage (client-side persistence for axios)
                if (typeof window !== 'undefined') {
                    localStorage.setItem('token', token);
                    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
                    localStorage.setItem('user', JSON.stringify(user));
                }

                // Save to cookie (for Middleware/SSR)
                Cookies.set('token', token, { expires: env.COOKIE_EXPIRES, path: '/' });
                if (refreshToken) Cookies.set('refreshToken', refreshToken, { expires: env.COOKIE_EXPIRES, path: '/' });
                Cookies.set('userRole', user.role, { expires: env.COOKIE_EXPIRES, path: '/' });

                return {
                    success: true,
                    user,
                    token,
                    refreshToken
                };
            }
            return {
                success: false,
                error: response.data.message || 'Login failed'
            };
        } catch (error: any) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message || 'Login failed'
            };
        }
    },
    googleLogin: async (idToken: string): Promise<LoginResponse> => {
        try {
            const response = await api.post('/auth/google-login', { idToken });

            if (response.data.success) {
                const { token, refreshToken, user } = response.data.data;

                if (typeof window !== 'undefined') {
                    localStorage.setItem('token', token);
                    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
                    localStorage.setItem('user', JSON.stringify(user));
                }

                Cookies.set('token', token, { expires: env.COOKIE_EXPIRES, path: '/' });
                if (refreshToken) Cookies.set('refreshToken', refreshToken, { expires: env.COOKIE_EXPIRES, path: '/' });
                Cookies.set('userRole', user.role, { expires: env.COOKIE_EXPIRES, path: '/' });

                return {
                    success: true,
                    user,
                    token
                };
            }
            return {
                success: false,
                error: response.data.message || 'Google login failed'
            };
        } catch (error: any) {
            console.error('Google login error:', error);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message || 'Google login failed'
            };
        }
    },

    logout: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
        }
        Cookies.remove('token', { path: '/' });
        Cookies.remove('refreshToken', { path: '/' });
        Cookies.remove('userRole', { path: '/' });
        return { success: true };
    },

    getCurrentUser: () => {
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    return JSON.parse(userStr);
                } catch {
                    return null;
                }
            }
        }
        return null;
    },

    refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
        try {
            const response = await api.post('/auth/refresh', { refreshToken });
            if (response.data.success) {
                const { access_token, refresh_token } = response.data.data;

                if (typeof window !== 'undefined') {
                    localStorage.setItem('token', access_token);
                    if (refresh_token) localStorage.setItem('refreshToken', refresh_token);
                }

                Cookies.set('token', access_token, { expires: env.COOKIE_EXPIRES, path: '/' });
                if (refresh_token) Cookies.set('refreshToken', refresh_token, { expires: env.COOKIE_EXPIRES, path: '/' });

                return {
                    success: true,
                    token: access_token,
                    refreshToken: refresh_token
                };
            }
            return { success: false, error: 'Refresh failed' };
        } catch (error: any) {
            console.error('Refresh error:', error);
            return { success: false, error: error.message };
        }
    }
};
