"use client";

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/components/layout/theme-provider';
import { accountService } from '@/services/api/account.api';
import { usePreferencesStore } from '@/stores/preferences-store';

/**
 * Loads the signed-in user's saved preferences once per session and applies
 * them: theme (through the existing ThemeProvider), reduced motion, and the
 * timezone / date / time formats used by preferences-store formatters.
 */
export function PreferencesSync() {
    const { user } = useAuth();
    const { setPreference } = useTheme();
    const loadedFor = useRef<string | null>(null);
    const prefs = usePreferencesStore((s) => s.prefs);

    useEffect(() => {
        if (!user?.id) {
            loadedFor.current = null;
            usePreferencesStore.getState().setPrefs(null);
            return;
        }
        if (loadedFor.current === user.id) return;
        loadedFor.current = user.id;
        accountService
            .overview()
            .then((o) => {
                usePreferencesStore.getState().setPrefs(o.preferences);
                setPreference(o.preferences.theme);
            })
            .catch(() => {
                loadedFor.current = null; // try again on the next render cycle
            });
    }, [user?.id, setPreference]);

    useEffect(() => {
        document.documentElement.classList.toggle('reduce-motion', !!prefs?.reduce_motion);
    }, [prefs?.reduce_motion]);

    return null;
}
