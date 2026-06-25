
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, LoginResponse } from '@/types/auth';
import { authService } from '@/services/api/auth.api';

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<LoginResponse>;
    googleLogin: (idToken: string) => Promise<LoginResponse>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    // Use lazy initializer to read from localStorage synchronously on first render
    const [user, setUser] = useState<User | null>(() => {
        if (typeof window === "undefined") return null;
        return authService.getCurrentUser();
    });
    const [isLoading, setIsLoading] = useState(() => {
        // If we found a user, we're not loading
        if (typeof window === "undefined") return true;
        return !authService.getCurrentUser();
    });

    // Mark loading as complete after mount
    useEffect(() => {
        setIsLoading(false);
    }, []);

    const login = async (username: string, password: string): Promise<LoginResponse> => {
        const response = await authService.login(username, password);
        if (response.success && response.user) {
            setUser(response.user);
        }
        return response;
    };

    const googleLogin = async (idToken: string): Promise<LoginResponse> => {
        const response = await authService.googleLogin(idToken);
        if (response.success && response.user) {
            setUser(response.user);
        }
        return response;
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        // Force refresh to trigger middleware redirect if needed
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, login, googleLogin, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}
