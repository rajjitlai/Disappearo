'use client';

import { useEffect, useState, useRef } from 'react';
import { getOrCreateProfile, ids, databases, client, clearAllChatRequests, getProfileWithUnbanCheck, deleteAllSessionMessages, deleteSession } from '@/app/lib/appwrite';
import { useAuth } from '@/app/state/AuthContext';
import { useRouter } from 'next/navigation';
import { ID, Query, Models } from 'appwrite';
import toast from 'react-hot-toast';

type UserLike = { $id: string; name?: string; email?: string } | null;
type ProfileDoc = {
    $id: string;
    handle: string;
    strikes?: number;
    banned?: boolean;
    bannedAt?: string;
    lastStrikeAt?: string;
} | null;
type ChatRequestDoc = {
    $id: string;
    fromId: string;
    toId: string;
    status: 'pending' | 'accepted' | 'declined' | 'cancelled';
    expiresAt?: string;
};

export default function DashboardPage() {
    const { user: authUser, signOut: authSignOut, refresh: authRefresh } = useAuth();
    const [user, setUser] = useState<UserLike>(null);
    const [profile, setProfile] = useState<ProfileDoc>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [targetId, setTargetId] = useState('');
    const [requests, setRequests] = useState<ChatRequestDoc[]>([]);
    const [outgoing, setOutgoing] = useState<ChatRequestDoc[]>([]);
    const [banRemainingMs, setBanRemainingMs] = useState<number>(0);
    // suppress auto-navigation when clearing outgoing (realtime may emit 'accepted')
    const suppressNavigateRef = useRef(false);

    // send a chat request
    async function sendRequest() {
        if (!profile) return;

        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        await databases.createDocument(ids.db, ids.chatrequests, ID.unique(), {
            fromId: profile.handle,
            toId: targetId.trim(),
            status: 'pending',
            expiresAt, // ⏳ new field
        });

        alert(`Chat request sent to ${targetId}`);
        setTargetId('');
    }

    // load current user + profile
    useEffect(() => {
        let isMounted = true;

        const loadUserAndProfile = async () => {
            try {
                // If no user in auth context, stop loading and redirect
                if (!authUser) {
                    if (isMounted) {
                        setLoading(false);
                        router.replace('/login');
                    }
                    return;
                }

                if (isMounted) {
                    setUser(authUser);
                }

                const p = await getOrCreateProfile(authUser as Models.User<Models.Preferences>);
                if (isMounted) {
                    setProfile(p as unknown as ProfileDoc);

                    // Check for auto-unban and show notification if unbanned
                    if (p) {
                        const unbanResult = await getProfileWithUnbanCheck(p.$id);
                        if (unbanResult?.unbanned) {
                            toast.success('Your account has been automatically unbanned. Strikes have been reset.');
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading user/profile:', error);
                if (isMounted) {
                    // If there's an error, redirect to login
                    router.replace('/login');
                }
                return;
            } finally {
                if (isMounted) {
                    // Always set loading to false, regardless of success or failure
                    setLoading(false);
                }
            }
        };

        // Load profile whenever we have a user
        if (authUser) {
            loadUserAndProfile();
        } else {
            // No user: ensure we don't keep spinner indefinitely
            setLoading(false);
        }

        return () => {
            isMounted = false;
        };
    }, [authUser, router]);

    // Handle sign out
    const handleSignOut = async () => {
        try {
            // Use the auth context signOut function
            await authSignOut();

            // Clear local state
            setUser(null);
            setProfile(null);
            setRequests([]);
            setOutgoing([]);

            // Small delay to ensure auth context is updated
            await new Promise(resolve => setTimeout(resolve, 100));

            // Redirect to home page
            router.replace('/');
        } catch (error) {
            console.error('Error during sign out:', error);
            // Fallback redirect
            router.replace('/');
        }
    };

    // Manual refresh function
    const handleManualRefresh = async () => {
        console.log('Manual refresh triggered');
        setLoading(true);
        try {
            // Use the auth context refresh function
            await authRefresh();

            // Reload profile data
            if (authUser) {
                const p = await getOrCreateProfile(authUser as Models.User<Models.Preferences>);
                setProfile(p as unknown as ProfileDoc);

                // Check for auto-unban
                if (p) {
                    const unbanResult = await getProfileWithUnbanCheck(p.$id);
                    if (unbanResult?.unbanned) {
                        toast.success('Your account has been automatically unbanned. Strikes have been reset.');
                    }
                }
            }
        } catch (error) {
            console.error('Manual refresh error:', error);
            router.replace('/login');
        } finally {
            setLoading(false);
        }
    };

    // Live ban countdown timer (updates every second when banned)
    useEffect(() => {
        if (!profile?.banned || !profile?.bannedAt) { setBanRemainingMs(0); return; }
        const compute = () => {
            const bannedTime = new Date(profile.bannedAt || 0).getTime();
            const banDuration = 10 * 60 * 1000; // 10 minutes
            const remaining = Math.max(0, bannedTime + banDuration - Date.now());
            setBanRemainingMs(remaining);
        };
        compute();
        const t = setInterval(compute, 1000);
        return () => clearInterval(t);
    }, [profile?.banned, profile?.bannedAt]);

    // Auto-refresh unban status when countdown finishes
    useEffect(() => {
        if (!profile?.banned) return;
        if (banRemainingMs > 0) return;
        (async () => {
            try {
                const res = await getProfileWithUnbanCheck(profile.$id);
                if (res?.unbanned) {
                    toast.success('Your account has been automatically unbanned. Strikes have been reset.');
                    // res.profile may be a generic Models.Document; update minimal flags
                    setProfile({
                        ...(profile as any),
                        banned: false,
                        strikes: 0,
                        bannedAt: null as unknown as string,
                        lastStrikeAt: null as unknown as string,
                    } as ProfileDoc);
                }
            } catch { }
        })();
    }, [banRemainingMs, profile]);

    // Realtime listener for profile unban updates
    useEffect(() => {
        if (!profile?.$id) return;
        const channel = `databases.${ids.db}.collections.${ids.profile}.documents.${profile.$id}`;
        const unsubscribe = client.subscribe(channel, (res) => {
            const isUpdate = res.events?.some((e: string) => e.endsWith('.update'));
            if (!isUpdate) return;
            const payload = res.payload as unknown as ProfileDoc;
            // Update banned/strikes state live
            setProfile((prev) => ({ ...(prev as any), ...(payload as any) } as ProfileDoc));
        });
        return () => {
            try { unsubscribe(); } catch { }
        };
    }, [profile?.$id]);

    // fetch my incoming pending requests
    useEffect(() => {
        if (!profile) return;

        const load = async () => {
            const res = await databases.listDocuments(ids.db, ids.chatrequests, [
                Query.equal('toId', profile.handle),
                Query.equal('status', 'pending'),
            ]);
            setRequests(res.documents as unknown as ChatRequestDoc[]);
        };
        load();
    }, [profile]);

    // fetch my outgoing requests (pending or accepted) in parallel
    useEffect(() => {
        if (!profile) return;

        const load = async () => {
            const [pending, accepted] = await Promise.all([
                databases.listDocuments(ids.db, ids.chatrequests, [
                    Query.equal('fromId', profile.handle),
                    Query.equal('status', 'pending'),
                ]),
                databases.listDocuments(ids.db, ids.chatrequests, [
                    Query.equal('fromId', profile.handle),
                    Query.equal('status', 'accepted'),
                ]),
            ]);
            setOutgoing([...(pending.documents as unknown as ChatRequestDoc[]), ...(accepted.documents as unknown as ChatRequestDoc[])]);
        };
        load();
    }, [profile]);

    // auto-expire requests on frontend
    useEffect(() => {
        const timer = setInterval(() => {
            setRequests((prev) =>
                prev.filter((req) => {
                    const exp = req.expiresAt ? new Date(req.expiresAt).getTime() : 0;
                    return Date.now() < exp; // keep only non-expired
                })
            );
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // accept/decline a request
    async function handleRequest(req: ChatRequestDoc, accepted: boolean) {
        if (accepted) {
            await databases.createDocument(ids.db, ids.chatsessions, ID.custom(req.$id), {
                participants: [req.fromId, req.toId],
            });

            await databases.updateDocument(ids.db, ids.chatrequests, req.$id, {
                status: 'accepted',
            });

            alert(`Chat started with ${req.fromId}`);
            router.push(`/chat/${req.$id}`);
        } else {
            await databases.updateDocument(ids.db, ids.chatrequests, req.$id, {
                status: 'declined',
            });
        }

        setRequests((prev) => prev.filter((r) => r.$id !== req.$id));
    }

    // cancel an outgoing request
    async function cancelOutgoing(req: ChatRequestDoc) {
        await databases.updateDocument(ids.db, ids.chatrequests, req.$id, {
            status: 'cancelled',
        });
        setOutgoing((prev) => prev.filter((r) => r.$id !== req.$id));
    }



    // realtime subscription for requests (incoming + outgoing)
    useEffect(() => {
        if (!profile) return;

        const unsubscribe = client.subscribe(
            `databases.${ids.db}.collections.${ids.chatrequests}.documents`,
            (res) => {
                const doc = res.payload as ChatRequestDoc;
                // incoming pending
                if (doc.toId === profile.handle && doc.status === 'pending') {
                    setRequests((prev) => [...prev, doc]);
                }
                // outgoing updates
                if (doc.fromId === profile.handle) {
                    setOutgoing((prev) => {
                        const others = prev.filter((r) => r.$id !== doc.$id);
                        return [...others, doc];
                    });
                    // auto-join when accepted by the other party → request id is session id
                    if (doc.status === 'accepted' && !suppressNavigateRef.current) {
                        router.push(`/chat/${doc.$id}`);
                    }
                }
            }
        );

        return () => unsubscribe();
    }, [profile, router]);

    // clear all chat requests
    async function handleClearAllRequests() {
        const ok = window.confirm('Are you sure you want to clear all chat requests? This action cannot be undone.');
        if (!ok) return;

        try {
            const success = await clearAllChatRequests();
            if (success) {
                setRequests([]);
                setOutgoing([]);
                toast.success('All chat requests cleared successfully');
            } else {
                toast.error('Failed to clear some chat requests');
            }
        } catch {
            toast.error('Failed to clear chat requests');
        }
    }

    // clear all outgoing requests
    async function handleClearAllOutgoing() {
        const ok = window.confirm('Are you sure you want to clear all outgoing requests? This action cannot be undone.');
        if (!ok) return;

        try {
            suppressNavigateRef.current = true;
            // For all my outgoing requests:
            for (const req of outgoing) {
                // If a request created a chat session (accepted), delete the session and its messages
                if (req.status === 'accepted') {
                    try {
                        await deleteAllSessionMessages(req.$id);
                    } catch { }
                    try {
                        await deleteSession(req.$id);
                    } catch { }
                }
                // Cancel or delete the request itself
                try {
                    await databases.updateDocument(ids.db, ids.chatrequests, req.$id, { status: 'cancelled' });
                } catch {
                    try { await databases.deleteDocument(ids.db, ids.chatrequests, req.$id); } catch { }
                }
            }
            setOutgoing([]);
            toast.success('All outgoing requests cleared successfully');
        } catch (error) {
            console.error('Error clearing outgoing requests:', error);
            toast.error('Failed to clear some outgoing requests');
        } finally {
            setTimeout(() => { suppressNavigateRef.current = false; }, 600);
        }
    }

    if (loading) return (
        <div className="min-h-dvh grid place-items-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="text-center space-y-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto"></div>
                    <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 rounded-full animate-ping opacity-20"></div>
                </div>
                <div className="space-y-2">
                    <div className="text-xl font-semibold text-[var(--foreground)]">Loading dashboard...</div>
                    <div className="text-[var(--muted-foreground)]">Please wait while we load your profile</div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-dvh bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="max-w-6xl mx-auto p-4 sm:p-6">
                <header className="mb-8">
                    <div className="bg-[var(--card-background)] rounded-2xl p-6 shadow-sm border border-[var(--border)]">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Dashboard</h1>
                                <p className="text-[var(--muted-foreground)] mt-1">Welcome back, {user?.name || user?.email}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleManualRefresh}
                                    className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-800 transition-all duration-200 shadow-sm hover:shadow-md"
                                    title="Refresh dashboard data"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleSignOut}
                                    className="px-4 py-2 border-2 border-[var(--border)] text-[var(--foreground)] rounded-xl hover:bg-[var(--muted)] transition-all duration-200"
                                >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="space-y-6">
                    {/* Profile & Account Cards */}
                    <div className="grid gap-6 sm:grid-cols-2">
                        {/* Profile Card */}
                        <div className="bg-[var(--card-background)] rounded-2xl p-6 shadow-sm border border-[var(--border)] hover:shadow-md transition-all duration-200">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[var(--foreground)]">Your Disappearo ID</h3>
                                    <p className="text-sm text-[var(--muted-foreground)]">Share this ID to start chats</p>
                                </div>
                            </div>
                            <div className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400 break-all bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl flex items-center justify-between gap-3">
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                                        <span className="text-blue-400">Loading...</span>
                                    </div>
                                ) : profile?.handle ? (
                                    <>
                                        <span className="truncate">{profile.handle}</span>
                                        <button
                                            onClick={async () => {
                                                try { await navigator.clipboard.writeText(profile.handle); toast.success('Copied ID'); } catch { toast.error('Copy failed'); }
                                            }}
                                            className="text-xs font-normal bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 dark:text-blue-200 px-2 py-1 rounded-md border border-blue-300/40"
                                            aria-label="Copy Disappearo ID"
                                        >
                                            Copy
                                        </button>
                                    </>
                                ) : (
                                    <span className="text-red-400">Failed to load</span>
                                )}
                            </div>
                        </div>

                        {/* Account Card */}
                        <div className="bg-[var(--card-background)] rounded-2xl p-6 shadow-sm border border-[var(--border)] hover:shadow-md transition-all duration-200">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[var(--foreground)]">Account</h3>
                                    <p className="text-sm text-[var(--muted-foreground)]">Your account details</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {loading ? (
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-[var(--foreground)] font-medium truncate">{user?.name || user?.email}</div>
                                        <div className="text-sm text-[var(--muted-foreground)] font-mono">ID: {user?.$id}</div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Strike Status Card */}
                        <div className="bg-[var(--card-background)] rounded-2xl p-6 shadow-sm border border-[var(--border)] hover:shadow-md transition-all duration-200">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[var(--foreground)]">Content Moderation</h3>
                                    <p className="text-sm text-[var(--muted-foreground)]">Your moderation status</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[var(--foreground)] text-sm">Strikes:</span>
                                    <span className={`font-mono text-lg font-bold ${profile?.strikes && profile.strikes > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                                        {profile?.strikes || 0}/3
                                    </span>
                                </div>
                                {profile?.banned ? (
                                    <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            <span className="text-red-600 dark:text-red-400 text-sm font-medium">Account Banned</span>
                                        </div>
                                        <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                                            {banRemainingMs > 0 ? (
                                                <>Unban in {String(Math.floor(banRemainingMs / 60000)).padStart(2, '0')}:{String(Math.floor((banRemainingMs % 60000) / 1000)).padStart(2, '0')}</>
                                            ) : (
                                                <>Unbanning soon…</>
                                            )}
                                        </p>
                                    </div>
                                ) : profile?.strikes && profile.strikes > 0 ? (
                                    <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                            <span className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Warning</span>
                                        </div>
                                        <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                                            {3 - (profile.strikes || 0)} more violation(s) before ban
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-green-600 dark:text-green-400 text-sm font-medium">Good Standing</span>
                                        </div>
                                        <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                                            No violations recorded
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Start a Chat */}
                    <div className="bg-[var(--card-background)] rounded-2xl p-6 shadow-sm border border-[var(--border)] hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--foreground)]">Start a Chat</h3>
                                <p className="text-sm text-[var(--muted-foreground)]">Connect with friends using their Disappearo ID</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                placeholder="Enter friend's Disappearo ID"
                                className="w-full border border-[var(--border)] py-3 px-4 bg-[var(--input-background)] text-[var(--input-foreground)] placeholder-[var(--muted-foreground)] text-base focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                            />
                            <button
                                onClick={sendRequest}
                                className="px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-xl font-medium hover:bg-blue-700 dark:hover:bg-blue-800 transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                                Send Request
                            </button>
                        </div>
                    </div>

                    {/* Pending Requests */}
                    <div className="bg-[var(--card-background)] rounded-2xl p-6 shadow-sm border border-[var(--border)] hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-[var(--foreground)]">Pending Requests</h3>
                                    <p className="text-sm text-[var(--muted-foreground)]">Chat requests waiting for your response</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClearAllRequests}
                                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-xl hover:bg-red-700 dark:hover:bg-red-800 transition-all duration-200 shadow-sm hover:shadow-md"
                                title="Clear all chat requests"
                            >
                                Clear All
                            </button>
                        </div>

                        {requests.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-[var(--muted)] rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                </div>
                                <p className="text-[var(--muted-foreground)] font-medium">No pending requests</p>
                                <p className="text-sm text-[var(--muted-foreground)]">When someone sends you a chat request, it will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {requests.map((req) => {
                                    const exp = req.expiresAt ? new Date(req.expiresAt).getTime() : 0;
                                    const remaining = Math.max(0, Math.floor((exp - Date.now()) / 1000));
                                    const mins = Math.floor(remaining / 60);
                                    const secs = remaining % 60;

                                    return (
                                        <div key={req.$id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-[var(--border)] rounded-xl gap-4 bg-[var(--muted)] hover:bg-[var(--muted)] transition-all duration-200">
                                            <div className="flex-1">
                                                <div className="font-semibold text-[var(--foreground)] mb-1">{req.fromId}</div>
                                                <div className="text-sm text-[var(--muted-foreground)]">
                                                    Expires in <span className="font-mono text-orange-600 dark:text-orange-400">{mins}m {secs}s</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleRequest(req, true)}
                                                    className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-700 dark:hover:bg-green-800 transition-all duration-200 shadow-sm hover:shadow-md"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => handleRequest(req, false)}
                                                    className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-800 transition-all duration-200 shadow-sm hover:shadow-md"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Outgoing Requests */}
                    <div className="bg-[var(--card-background)] rounded-2xl p-6 shadow-sm border border-[var(--border)] hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-[var(--foreground)]">Outgoing Requests</h3>
                                    <p className="text-sm text-[var(--muted-foreground)]">Chat requests you&apos;ve sent to others</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClearAllOutgoing}
                                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-xl hover:bg-red-700 dark:hover:bg-red-800 transition-all duration-200 shadow-sm hover:shadow-md"
                                title="Clear all outgoing requests"
                            >
                                Clear All
                            </button>
                        </div>

                        {outgoing.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-[var(--muted)] rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p className="text-[var(--muted-foreground)] font-medium">No outgoing requests</p>
                                <p className="text-sm text-[var(--muted-foreground)]">Send chat requests to start conversations</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {outgoing.map((req) => (
                                    <div key={req.$id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-[var(--border)] rounded-xl gap-4 bg-[var(--muted)] hover:bg-[var(--muted)] transition-all duration-200">
                                        <div className="flex-1">
                                            <div className="font-semibold text-[var(--foreground)] mb-1">To: {req.toId}</div>
                                            <div className="text-sm text-[var(--muted-foreground)]">
                                                Status: <span className={`capitalize font-medium ${req.status === 'accepted' ? 'text-green-600 dark:text-green-400' : req.status === 'declined' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{req.status}</span>
                                            </div>
                                        </div>
                                        {req.status === 'pending' && (
                                            <button
                                                onClick={() => cancelOutgoing(req)}
                                                className="px-4 py-2 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-lg text-sm font-medium hover:bg-[var(--muted)] transition-all duration-200 shadow-sm hover:shadow-md"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
