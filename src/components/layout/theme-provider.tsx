"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
/** What the user chose; "system" follows the operating system. */
export type ThemePreference = Theme | "system";

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
};

type ThemeProviderState = {
    /** The theme actually applied. */
    theme: Theme;
    /** Pick light/dark explicitly (header toggle). */
    setTheme: (theme: Theme) => void;
    preference: ThemePreference;
    setPreference: (preference: ThemePreference) => void;
    mounted: boolean;
};

const initialState: ThemeProviderState = {
    theme: "dark",
    setTheme: () => null,
    preference: "dark",
    setPreference: () => null,
    mounted: false,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function systemTheme(): Theme {
    if (typeof window === "undefined" || !window.matchMedia) return "dark";
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function readPreference(fallback: Theme): ThemePreference {
    if (typeof window === "undefined") return fallback;
    try {
        const saved = localStorage.getItem("theme");
        return saved === "dark" || saved === "light" || saved === "system" ? saved : fallback;
    } catch {
        return fallback;
    }
}

export function ThemeProvider({
    children,
    defaultTheme = "dark",
}: ThemeProviderProps) {
    // Lazy initializer reads localStorage synchronously on first render
    const [preference, setPreferenceState] = useState<ThemePreference>(() => readPreference(defaultTheme));
    const [osTheme, setOsTheme] = useState<Theme>(() => systemTheme());
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Follow OS changes while the preference is "system".
    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const mq = window.matchMedia("(prefers-color-scheme: light)");
        const onChange = () => setOsTheme(mq.matches ? "light" : "dark");
        mq.addEventListener?.("change", onChange);
        return () => mq.removeEventListener?.("change", onChange);
    }, []);

    const theme: Theme = preference === "system" ? osTheme : preference;

    // Apply theme class to document
    useEffect(() => {
        if (!mounted) return;
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
    }, [theme, mounted]);

    const setPreference = (next: ThemePreference) => {
        try {
            localStorage.setItem("theme", next);
        } catch {
            /* storage unavailable: still apply for this session */
        }
        setPreferenceState(next);
    };

    const value = {
        theme,
        setTheme: (newTheme: Theme) => setPreference(newTheme),
        preference,
        setPreference,
        mounted,
    };

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
