'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser, logout, getOrCreateProfile, ids, databases, client } from '@/app/lib/appwrite';
import { useAuth } from '@/app/state/AuthContext';
import { useRouter } from 'next/navigation';
import { ID, Query } from 'appwrite';

type UserLike = { $id: string; name?: string; email?: string } | null;
type ProfileDoc = { $id: string; handle: string } | null;
type ChatRequestDoc = {
    $id: string;
    fromId: string;
    toId: string;
    status: 'pending' | 'accepted' | 'declined' | 'cancelled';
    expiresAt?: string;
};
type SessionDoc = { $id: string; participants: string[] };

export default function DashboardPage() {
    const { user: authUser, loading: authLoading } = useAuth();
    const [user, setUser] = useState<UserLike>(null);
    const [profile, setProfile] = useState<ProfileDoc>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [targetId, setTargetId] = useState('');
    const [requests, setRequests] = useState<ChatRequestDoc[]>([]);
    const [outgoing, setOutgoing] = useState<ChatRequestDoc[]>([]);

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
        (async () => {
            if (authLoading) return;
            const u = await getCurrentUser();
            if (!u) {
                router.replace('/login');
                return;
            }
            setUser(u as unknown as UserLike);

            const p = await getOrCreateProfile(u);
            setProfile(p as unknown as ProfileDoc);

            setLoading(false);
        })();
    }, [authLoading, router]);

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

    // fetch my outgoing requests (pending or accepted)
    useEffect(() => {
        if (!profile) return;

        const load = async () => {
            const pending = await databases.listDocuments(ids.db, ids.chatrequests, [
                Query.equal('fromId', profile.handle),
                Query.equal('status', 'pending'),
            ]);
            const accepted = await databases.listDocuments(ids.db, ids.chatrequests, [
                Query.equal('fromId', profile.handle),
                Query.equal('status', 'accepted'),
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
            const session = await databases.createDocument(ids.db, ids.chatsessions, ID.custom(req.$id), {
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

    // attempt to join a session created for this pair
    const joinSessionWith = useCallback(async (partnerHandle: string) => {
        // Try to find an existing session for both participants
        const res = await databases.listDocuments(ids.db, ids.chatsessions, [
            Query.contains('participants', profile!.handle),
            Query.contains('participants', partnerHandle),
        ]);
        const session = (res.documents as unknown as SessionDoc[])[0];
        if (session) {
            router.push(`/chat/${session.$id}`);
            return;
        }

        // If not found yet (race), subscribe once to detect creation
        const unsubscribe = client.subscribe(
            `databases.${ids.db}.collections.${ids.chatsessions}.documents`,
            (ev) => {
                const doc = ev.payload as SessionDoc;
                if (
                    Array.isArray(doc.participants) &&
                    doc.participants.includes(profile!.handle) &&
                    doc.participants.includes(partnerHandle)
                ) {
                    unsubscribe();
                    router.push(`/chat/${doc.$id}`);
                }
            }
        );
    }, [ids.chatsessions, ids.db, profile, router]);

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
                    if (doc.status === 'accepted') {
                        router.push(`/chat/${doc.$id}`);
                    }
                }
            }
        );

        return () => unsubscribe();
    }, [profile, router]);

    if (loading) return <div className="min-h-dvh grid place-items-center">Loading…</div>;

    return (
        <div className="min-h-dvh p-6">
            <header className="flex items-center justify-between border-b pb-4">
                <h1 className="text-2xl font-semibold">Dashboard</h1>
                <button
                    onClick={async () => {
                        await logout();
                        router.replace('/login');
                    }}
                    className="rounded-xl bg-gray-900 text-white px-4 py-2"
                >
                    Sign out
                </button>
            </header>

            <main className="mt-6 grid gap-4 sm:grid-cols-2">
                {/* Profile Card */}
                <div className="rounded-2xl border p-4">
                    <div className="text-gray-500 text-sm">Your Disappearo ID</div>
                    <div className="mt-1 text-lg font-mono font-medium">{profile?.handle}</div>
                    <div className="text-xs text-gray-400 mt-1">Share this ID to start chats</div>
                </div>

                {/* Account Card */}
                <div className="rounded-2xl border p-4">
                    <div className="text-gray-500 text-sm">Account</div>
                    <div className="mt-1 font-medium">{user?.name || user?.email}</div>
                    <div className="text-sm text-gray-500 mt-1 truncate">ID: {user?.$id}</div>
                </div>

                {/* Start a Chat */}
                <div className="rounded-2xl border p-4">
                    <div className="text-gray-500 text-sm">Start a Chat</div>
                    <div className="flex gap-2 mt-2">
                        <input
                            type="text"
                            value={targetId}
                            onChange={(e) => setTargetId(e.target.value)}
                            placeholder="Enter friend's Disappearo ID"
                            className="flex-1 rounded-xl border py-2 px-3"
                        />
                        <button
                            onClick={sendRequest}
                            className="rounded-xl bg-indigo-600 text-white px-4 py-2"
                        >
                            Send
                        </button>
                    </div>
                </div>

                {/* Pending Requests */}
                <div className="rounded-2xl border p-4 col-span-2">
                    <h2 className="text-lg font-semibold mb-2">Pending Requests</h2>
                    {requests.length === 0 && <p className="text-gray-500">No pending requests</p>}

                    <ul className="space-y-2">
                        {requests.map((req) => {
                            const exp = req.expiresAt ? new Date(req.expiresAt).getTime() : 0;
                            const remaining = Math.max(0, Math.floor((exp - Date.now()) / 1000));
                            const mins = Math.floor(remaining / 60);
                            const secs = remaining % 60;

                            return (
                                <li
                                    key={req.$id}
                                    className="border rounded-xl p-3 flex justify-between items-center"
                                >
                                    <span>
                                        From: {req.fromId}{' '}
                                        <span className="text-xs text-gray-500">
                                            (expires in {mins}:{secs.toString().padStart(2, '0')})
                                        </span>
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRequest(req, true)}
                                            className="bg-green-600 text-white px-3 py-1 rounded-lg"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleRequest(req, false)}
                                            className="bg-red-600 text-white px-3 py-1 rounded-lg"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Your Sent Requests */}
                <div className="rounded-2xl border p-4 col-span-2">
                    <h2 className="text-lg font-semibold mb-2">Your Sent Requests</h2>
                    {outgoing.length === 0 && <p className="text-gray-500">No sent requests</p>}

                    <ul className="space-y-2">
                        {outgoing.map((req) => {
                            const exp = req.expiresAt ? new Date(req.expiresAt).getTime() : 0;
                            const remaining = Math.max(0, Math.floor((exp - Date.now()) / 1000));
                            const mins = Math.floor(remaining / 60);
                            const secs = remaining % 60;

                            return (
                                <li key={req.$id} className="border rounded-xl p-3 flex justify-between items-center">
                                    <span>
                                        To: {req.toId}{' '}
                                        {req.expiresAt && (
                                            <span className="text-xs text-gray-500">
                                                (expires in {mins}:{secs.toString().padStart(2, '0')})
                                            </span>
                                        )}
                                        <span className="ml-2 text-xs uppercase tracking-wide text-gray-500">{req.status}</span>
                                    </span>
                                    <div className="flex gap-2">
                                        {req.status === 'pending' && (
                                            <button
                                                onClick={() => cancelOutgoing(req)}
                                                className="bg-gray-200 text-gray-900 px-3 py-1 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        {req.status === 'accepted' && (
                                            <button
                                                onClick={() => joinSessionWith(req.toId)}
                                                className="bg-indigo-600 text-white px-3 py-1 rounded-lg"
                                            >
                                                Join
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </main>
        </div>
    );
}
