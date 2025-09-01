'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { account, getCurrentUser, logout } from '@/app/lib/appwrite';

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
            const u = await getCurrentUser();
            setUser(u as any);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const signOut = useCallback(async () => {
        await logout();
        setUser(null);
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


