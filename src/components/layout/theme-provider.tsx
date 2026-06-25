"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
};

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    mounted: boolean;
};

const initialState: ThemeProviderState = {
    theme: "dark",
    setTheme: () => null,
    mounted: false,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = "dark",
}: ThemeProviderProps) {
    // Use lazy initializer to read from localStorage synchronously on first render
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window === "undefined") return defaultTheme;
        const saved = localStorage.getItem("theme") as Theme;
        return saved && (saved === "dark" || saved === "light") ? saved : defaultTheme;
    });
    const [mounted, setMounted] = useState(false);

    // Mark as mounted after first render
    useEffect(() => {
        setMounted(true);
    }, []);

    // Apply theme class to document
    useEffect(() => {
        if (!mounted) return;
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
    }, [theme, mounted]);

    const value = {
        theme,
        setTheme: (newTheme: Theme) => {
            localStorage.setItem("theme", newTheme);
            setTheme(newTheme);
        },
        mounted,
    };

    // Prevent flash by not rendering until mounted
    // The body already has suppressHydrationWarning in layout.tsx
    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);
    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider");
    return context;
};
