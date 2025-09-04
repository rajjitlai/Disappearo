'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, logout } from '@/app/lib/appwrite';

type AuthUser = { $id: string; name?: string; email?: string } | null;

type AuthContextValue = {
    user: AuthUser;
    loading: boolean;
    refresh: () => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            const u = await getCurrentUser();
            setUser(u);

            // If user is authenticated, set the d_auth cookie for middleware
            if (u) {
                try {
                    const secure = location.protocol === 'https:' ? '; secure' : '';
                    // Extend cookie lifetime to 7 days
                    document.cookie = `d_auth=1; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax${secure}`;
                } catch (cookieError) {
                    console.warn('Failed to set d_auth cookie:', cookieError);
                }
            } else {
                // Clear the cookie if no user
                try {
                    document.cookie = 'd_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                } catch (cookieError) {
                    console.warn('Failed to clear d_auth cookie:', cookieError);
                }
            }
        } catch (error) {
            console.error('Error refreshing user:', error);
            setUser(null);
            // Clear the cookie on error
            try {
                document.cookie = 'd_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            } catch (cookieError) {
                console.warn('Failed to clear d_auth cookie:', cookieError);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        // Keep auth fresh on window focus and at a periodic interval
        const onFocus = () => { refresh(); };
        window.addEventListener('focus', onFocus);
        const t = setInterval(() => { refresh(); }, 15 * 60 * 1000); // 15 minutes
        return () => {
            window.removeEventListener('focus', onFocus);
            clearInterval(t);
        };
    }, [refresh]);

    const signOut = useCallback(async () => {
        await logout();
        setUser(null);

        // Clear the d_auth cookie
        try {
            document.cookie = 'd_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        } catch (cookieError) {
            console.warn('Failed to clear d_auth cookie:', cookieError);
        }
    }, []);

    const value = useMemo(() => ({ user, loading, refresh, signOut }), [loading, refresh, signOut, user]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}


