'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/app/state/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { client, ids, getOrCreateProfile, getCurrentUser, sendMessage, listMessages, deleteAllSessionMessages, deleteSession, uploadImage, updateMessage, incrementStrike } from '@/app/lib/appwrite';
import toast from 'react-hot-toast';

type Profile = {
    $id: string;
    handle: string;
    userId: string;
    strikes?: number;
    banned?: boolean;
    [key: string]: unknown;
};



type Message = {
    $id: string;
    $createdAt: string;
    sender: string;
    text: string;
    sessionId: string;
    [key: string]: unknown;
};

type ModerateResponse = {
    ok: boolean;
    score?: Record<string, number>;
};

export default function ChatPage() {
    const { loading: authLoading } = useAuth();
    const { roomId } = useParams();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const unsubRef = useRef<null | (() => void)>(null);
    const inactivityTimerRef = useRef<null | ReturnType<typeof setInterval>>(null);
    const router = useRouter();
    const [exporting, setExporting] = useState(false);
    const lastDownloadedReqId = useRef<string | null>(null);

    // load user + profile
    useEffect(() => {
        (async () => {
            if (authLoading) return;
            const u = await getCurrentUser();
            if (!u) {
                router.replace('/login');
                return;
            }
            const p = await getOrCreateProfile(u);
            const profileData = p as unknown as Profile;
            setProfile(profileData);

            // Check if user is banned
            if (profileData.banned) {
                toast.error('Your account has been banned due to repeated violations');
                router.replace('/dashboard');
                return;
            }
        })();
    }, [authLoading, router]);

    // fetch messages
    useEffect(() => {
        if (!roomId) return;
        (async () => {
            const res = await listMessages(roomId as string);
            const docs = (res as { documents: unknown[] }).documents ?? res;
            // ensure unique and sorted
            const uniq = new Map<string, Message>();
            for (const d of docs) {
                const message = d as Message;
                uniq.set(message.$id, message);
            }
            const arr = Array.from(uniq.values()).sort((a, b) =>
                new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime()
            );
            setMessages(arr);
        })();
    }, [roomId]);

    // subscribe to realtime updates
    useEffect(() => {
        if (!roomId) return;

        const unsubscribe = client.subscribe(
            `databases.${ids.db}.collections.${ids.messages}.documents`,
            (res) => {
                const doc: Message = res.payload as Message;
                if (doc.sessionId === roomId) {
                    const isCreate = res.events.some((e: string) => e.endsWith('.create'));
                    const isDelete = res.events.some((e: string) => e.endsWith('.delete'));
                    const isUpdate = res.events.some((e: string) => e.endsWith('.update'));
                    setMessages((prev) => {
                        if (isDelete) return prev.filter((m) => m.$id !== doc.$id);
                        if (isUpdate) return prev.map((m) => (m.$id === doc.$id ? doc : m));
                        if (isCreate) {
                            // guard duplicate create
                            if (prev.some((m) => m.$id === doc.$id)) return prev;
                            return [...prev, doc];
                        }
                        return prev;
                    });
                }
            }
        );

        unsubRef.current = unsubscribe;
        return () => {
            unsubRef.current = null;
            unsubscribe();
        };
    }, [roomId]);

    // auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // inactivity expiry: if no messages from both sides for 5 minutes, purge and exit
    useEffect(() => {
        if (!profile) return;
        const interval = setInterval(async () => {
            if (messages.length === 0) return;
            const last = messages[messages.length - 1];
            const lastTs = new Date(last.$createdAt || Date.now()).getTime();
            const inactiveMs = Date.now() - lastTs;
            if (inactiveMs >= 5 * 60 * 1000) {
                // double-check at source by reloading recent messages
                const res = await listMessages(roomId as string);
                const docs = (res as { documents: unknown[] }).documents ?? res;
                const hasRecent = (docs as unknown[]).some((m) => {
                    const message = m as Message;
                    const ts = new Date(message.$createdAt || 0).getTime();
                    return Date.now() - ts < 5 * 60 * 1000;
                });
                if (!hasRecent) {
                    await deleteAllSessionMessages(roomId as string);
                    await deleteSession(roomId as string);
                    alert('Session expired due to inactivity. Messages deleted.');
                    router.replace('/dashboard');
                }
            }
        }, 15_000);
        inactivityTimerRef.current = interval;
        return () => {
            if (inactivityTimerRef.current) {
                clearInterval(inactivityTimerRef.current);
                inactivityTimerRef.current = null;
            }
        };
    }, [messages, profile, roomId, router]);

    // basic bad-words list (can be moved to server rules later)
    async function moderateText(content: string): Promise<ModerateResponse> {
        try {
            const res = await fetch('/api/moderate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'text', content }),
            });
            const data = await res.json();
            return data as ModerateResponse;
        } catch {
            return { ok: true };
        }
    }

    // send new message
    async function handleSend() {
        if (!text.trim() || !profile) return;
        const content = text.trim();
        const mod = await moderateText(content);
        if (!mod.ok) {
            const res = await incrementStrike(profile.$id);
            if (res.banned) {
                toast.error('Banned due to repeated violations. Your account has been suspended.');
                // Delete current chat and redirect to dashboard
                await deleteAllSessionMessages(roomId as string);
                await deleteSession(roomId as string);
                router.replace('/dashboard');
                return;
            }
            toast.error(`Message blocked. Strikes: ${res.strikes}/3`);
            return;
        }
        await sendMessage(roomId as string, profile.handle, content);
        setText('');
    }

    async function handlePickImage() {
        fileInputRef.current?.click();
    }

    async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f || !profile) return;
        try {
            const { url, fileId } = await uploadImage(f);
            if (url) {
                const mod = await fetch('/api/moderate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'image', url }),
                }).then(r => r.json()).catch(() => ({ ok: true }));
                if (!mod.ok) {
                    const res = await incrementStrike(profile.$id);
                    if (res.banned) {
                        toast.error('Banned due to repeated violations. Your account has been suspended.');
                        // Delete current chat and redirect to dashboard
                        await deleteAllSessionMessages(roomId as string);
                        await deleteSession(roomId as string);
                        router.replace('/dashboard');
                        return;
                    }
                    toast.error(`Image blocked. Strikes: ${res.strikes}/3`);
                    return;
                }
            }
            if (!url) {
                toast('Uploaded, but bucket lacks public view permissions');
            }
            // encode as control message to avoid schema changes
            const payload = `__image__|${encodeURIComponent(url)}|${fileId}|${encodeURIComponent(f.name)}`;
            await sendMessage(roomId as string, profile.handle, payload);
        } catch (err: unknown) {
            const error = err as Error;
            toast.error(error?.message || 'Failed to upload image');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    function toggleEmoji() {
        setShowEmoji((v) => !v);
    }

    function addEmoji(symbol: string) {
        const el = inputRef.current;
        if (!el) {
            setText((t) => t + symbol);
            return;
        }
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const newValue = el.value.slice(0, start) + symbol + el.value.slice(end);
        setText(newValue);
        // move caret after inserted emoji
        requestAnimationFrame(() => {
            el.focus();
            const pos = start + symbol.length;
            try { el.setSelectionRange(pos, pos); } catch { }
        });
    }

    // export coordination via special control messages
    const EXPORT_REQ = '__export_request__|';
    const EXPORT_APPROVE = '__export_approve__|';
    const EXPORT_CANCEL = '__export_cancel__|';
    // readable TXT export control messages
    const EXPORT_TXT_REQ = '__export_txt_request__|';
    const EXPORT_TXT_APPROVE = '__export_txt_approve__|';
    const EXPORT_TXT_CANCEL = '__export_txt_cancel__|';

    const exportState = useMemo(() => {
        // find the latest export request not cancelled
        let latestReqId: string | null = null;
        let requestedBy: string | null = null;
        const approvals = new Set<string>();
        let cancelled = false;

        for (const m of messages) {
            const t: string = m.text || '';
            if (t.startsWith(EXPORT_REQ)) {
                latestReqId = t.substring(EXPORT_REQ.length);
                requestedBy = m.sender;
                approvals.clear();
                cancelled = false;
            } else if (latestReqId && t === EXPORT_CANCEL + latestReqId) {
                cancelled = true;
            } else if (latestReqId && t === EXPORT_APPROVE + latestReqId) {
                approvals.add(m.sender);
            }
        }

        return {
            active: Boolean(latestReqId) && !cancelled,
            reqId: latestReqId,
            requestedBy,
            approvals,
            cancelled,
        } as {
            active: boolean;
            reqId: string | null;
            requestedBy: string | null;
            approvals: Set<string>;
            cancelled: boolean;
        };
    }, [messages]);

    const exportTxtState = useMemo(() => {
        let latestReqId: string | null = null;
        let requestedBy: string | null = null;
        const approvals = new Set<string>();
        let cancelled = false;

        for (const m of messages) {
            const t: string = m.text || '';
            if (t.startsWith(EXPORT_TXT_REQ)) {
                latestReqId = t.substring(EXPORT_TXT_REQ.length);
                requestedBy = m.sender;
                approvals.clear();
                cancelled = false;
            } else if (latestReqId && t === EXPORT_TXT_CANCEL + latestReqId) {
                cancelled = true;
            } else if (latestReqId && t === EXPORT_TXT_APPROVE + latestReqId) {
                approvals.add(m.sender);
            }
        }

        return {
            active: Boolean(latestReqId) && !cancelled,
            reqId: latestReqId,
            requestedBy,
            approvals,
            cancelled,
        } as {
            active: boolean;
            reqId: string | null;
            requestedBy: string | null;
            approvals: Set<string>;
            cancelled: boolean;
        };
    }, [messages]);

    async function requestExport() {
        if (!profile) return;
        const reqId = Math.random().toString(36).slice(2, 10);
        await sendMessage(roomId as string, profile.handle, EXPORT_REQ + reqId);
    }

    async function approveExport() {
        if (!profile || !exportState.reqId) return;
        await sendMessage(roomId as string, profile.handle, EXPORT_APPROVE + exportState.reqId);
    }

    async function cancelExport() {
        if (!profile || !exportState.reqId) return;
        await sendMessage(roomId as string, profile.handle, EXPORT_CANCEL + exportState.reqId);
    }

    async function requestExportTxt() {
        if (!profile) return;
        const reqId = Math.random().toString(36).slice(2, 10);
        await sendMessage(roomId as string, profile.handle, EXPORT_TXT_REQ + reqId);
    }

    async function approveExportTxt() {
        if (!profile || !exportTxtState.reqId) return;
        await sendMessage(roomId as string, profile.handle, EXPORT_TXT_APPROVE + exportTxtState.reqId);
    }

    async function cancelExportTxt() {
        if (!profile || !exportTxtState.reqId) return;
        await sendMessage(roomId as string, profile.handle, EXPORT_TXT_CANCEL + exportTxtState.reqId);
    }

    useEffect(() => {
        if (!profile || !exportState.active || !exportState.reqId) return;
        // both sides approved when approvals set contains at least two unique senders
        if (
            exportState.approvals.size >= 2 &&
            !exporting &&
            lastDownloadedReqId.current !== exportState.reqId
        ) {
            setExporting(true);
            lastDownloadedReqId.current = exportState.reqId;
            try {
                const data = messages
                    .filter((m: Message) => typeof m.text === 'string' && !m.text.startsWith('__export_'))
                    .map((m: Message) => ({
                        id: m.$id,
                        sender: m.sender,
                        text: m.text,
                        createdAt: m.$createdAt,
                    }));
                const blob = new Blob([JSON.stringify({ sessionId: roomId, messages: data }, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const ts = new Date().toISOString().replace(/[:.]/g, '-');
                a.href = url;
                a.download = `chat-${roomId}-${ts}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } finally {
                setExporting(false);
            }
        }
    }, [exportState, exporting, messages, profile, roomId]);

    // trigger TXT export when both approved
    useEffect(() => {
        if (!profile || !exportTxtState.active || !exportTxtState.reqId) return;
        if (
            exportTxtState.approvals.size >= 2 &&
            !exporting &&
            lastDownloadedReqId.current !== `txt:${exportTxtState.reqId}`
        ) {
            setExporting(true);
            lastDownloadedReqId.current = `txt:${exportTxtState.reqId}`;
            try {
                const rows = messages
                    .filter((m: Message) => {
                        const t = m.text as string;
                        return typeof t === 'string' && !t.startsWith('__export_');
                    })
                    .map((m: Message) => {
                        const ts = m.$createdAt ? new Date(m.$createdAt).toLocaleString() : '';
                        return `${ts} - ${m.sender}: ${m.text}`;
                    });
                const header = `Disappearo chat transcript\nSession: ${roomId}\nExported: ${new Date().toLocaleString()}\n\n`;
                const blob = new Blob([header + rows.join('\n')], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const tsNow = new Date().toISOString().replace(/[:.]/g, '-');
                a.href = url;
                a.download = `chat-${roomId}-${tsNow}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } finally {
                setExporting(false);
            }
        }
    }, [exportTxtState, exporting, messages, profile, roomId]);

    return (
        <div className="min-h-dvh flex flex-col bg-[var(--background)] text-[var(--foreground)]">
            <header className="border-b border-[var(--border)] bg-[var(--card-background)]">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <h1 className="font-semibold">Chat</h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={requestExport}
                            className="text-sm rounded-lg border border-[var(--border)] px-3 py-1 hover:bg-[var(--muted)] transition-colors"
                            disabled={exporting}
                        >
                            Export
                        </button>
                        <button
                            onClick={requestExportTxt}
                            className="text-sm rounded-lg border border-[var(--border)] px-3 py-1 hover:bg-[var(--muted)] transition-colors"
                            disabled={exporting}
                        >
                            Export TXT
                        </button>
                        <button
                            onClick={async () => {
                                const ok = window.confirm('Exit chat?');
                                if (!ok) return;
                                // proactively clean listeners/timers to prevent bounce
                                if (unsubRef.current) {
                                    try { unsubRef.current(); } catch { }
                                    unsubRef.current = null;
                                }
                                if (inactivityTimerRef.current) {
                                    clearInterval(inactivityTimerRef.current);
                                    inactivityTimerRef.current = null;
                                }
                                await deleteAllSessionMessages(roomId as string);
                                await deleteSession(roomId as string);
                                toast.success('Session deleted');
                                router.replace('/dashboard');
                            }}
                            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                        >
                            Exit
                        </button>
                    </div>
                </div>
            </header>

            {exportState.active && (
                <div className="max-w-5xl mx-auto px-4 mt-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100 p-3 flex items-center justify-between">
                    <div className="text-sm">
                        Export requested by <span className="font-medium">{exportState.requestedBy}</span>. Both participants must approve to save this chat.
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={approveExport}
                            className="rounded-lg bg-amber-800 dark:bg-amber-700 text-white text-xs px-3 py-1 hover:bg-amber-900 dark:hover:bg-amber-800 transition-colors"
                            disabled={exporting}
                        >
                            Approve
                        </button>
                        <button
                            onClick={cancelExport}
                            className="rounded-lg border border-gray-300 dark:border-gray-600 text-xs px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            disabled={exporting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {exportTxtState.active && (
                <div className="max-w-5xl mx-auto px-4 mt-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100 p-3 flex items-center justify-between">
                    <div className="text-sm">
                        TXT export requested by <span className="font-medium">{exportTxtState.requestedBy}</span>. Both participants must approve to save a readable transcript.
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={approveExportTxt}
                            className="rounded-lg bg-emerald-700 dark:bg-emerald-600 text-white text-xs px-3 py-1 hover:bg-emerald-800 dark:hover:bg-emerald-700 transition-colors"
                            disabled={exporting}
                        >
                            Approve
                        </button>
                        <button
                            onClick={cancelExportTxt}
                            className="rounded-lg border border-gray-300 dark:border-gray-600 text-xs px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            disabled={exporting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <main className="flex-1 overflow-y-auto bg-[var(--muted)]">
                <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
                    {messages.map((msg) => {
                        const ts = msg.$createdAt ? new Date(msg.$createdAt) : null;
                        const time = ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                        const mine = msg.sender === profile?.handle;
                        const t: string = msg.text ?? '';
                        const isImage = typeof t === 'string' && t.startsWith('__image__|');
                        const isControl = typeof t === 'string' && t.startsWith('__export_');
                        let imageUrl = '';
                        let imageName = '';
                        if (isImage) {
                            const parts = t.split('|');
                            imageUrl = decodeURIComponent(parts[1] || '');
                            imageName = decodeURIComponent(parts[3] || 'image');
                        }
                        const withinEditWindow = mine && ts ? (Date.now() - ts.getTime() <= 5 * 60 * 1000) : false;
                        return (
                            <div
                                key={msg.$id}
                                className={`p-3 rounded-2xl max-w-xs shadow-sm ${mine
                                    ? 'ml-auto bg-blue-600 dark:bg-blue-700 text-white'
                                    : 'mr-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                {isImage ? (
                                    <div className="rounded-lg overflow-hidden">
                                        <img
                                            src={imageUrl}
                                            alt={imageName}
                                            className="block w-full h-auto pointer-events-none select-none"
                                            draggable={false}
                                            onContextMenu={(ev) => ev.preventDefault()}
                                        />
                                    </div>
                                ) : editingId === msg.$id ? (
                                    <div className="space-y-2">
                                        <input
                                            className="w-full rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            value={editingText}
                                            onChange={(e) => setEditingText(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                className={`text-[11px] rounded px-2 py-1 ${mine
                                                    ? 'bg-white/20 text-white hover:bg-white/30'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                    } transition-colors`}
                                                onClick={async () => {
                                                    const trimmed = editingText.trim();
                                                    if (!trimmed) { setEditingId(null); return; }
                                                    await updateMessage(msg.$id, { text: trimmed });
                                                    setEditingId(null);
                                                    setEditingText('');
                                                }}
                                            >
                                                Save
                                            </button>
                                            <button
                                                className={`text-[11px] rounded px-2 py-1 ${mine
                                                    ? 'bg-white/10 text-white hover:bg-white/20'
                                                    : 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-400 dark:hover:bg-gray-500'
                                                    } transition-colors`}
                                                onClick={() => { setEditingId(null); setEditingText(''); }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm whitespace-pre-wrap break-words">{msg.text}</div>
                                )}
                                <div className={`text-[10px] mt-2 flex items-center gap-2 ${mine
                                    ? 'text-blue-100/80'
                                    : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                    <span>{msg.sender}</span>
                                    {time && <span aria-hidden>•</span>}
                                    {time && <time dateTime={ts!.toISOString()}>{time}</time>}
                                    {withinEditWindow && !isImage && !isControl && editingId !== msg.$id && (
                                        <button
                                            className={`ml-2 underline hover:no-underline transition-all ${mine
                                                ? 'text-blue-100 hover:text-white'
                                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                                }`}
                                            onClick={() => { setEditingId(msg.$id); setEditingText(t); }}
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={bottomRef} />
                </div>
            </main>

            <footer className="border-t border-[var(--border)] bg-[var(--card-background)]">
                <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <div className="flex gap-2 items-center">
                            <input ref={fileInputRef} onChange={handleImageSelected} type="file" accept="image/*" className="hidden" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--input-background)] text-[var(--input-foreground)] placeholder-[var(--muted-foreground)] text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            />
                            <button
                                onClick={handlePickImage}
                                className="rounded-lg px-2 sm:px-3 py-2 border border-[var(--border)] text-xs sm:text-sm hover:bg-[var(--muted)] transition-colors"
                                title="Send an image"
                            >
                                Image
                            </button>
                            <button
                                onClick={toggleEmoji}
                                className="rounded-lg px-2 sm:px-3 py-2 border border-[var(--border)] text-xs sm:text-sm hover:bg-[var(--muted)] transition-colors"
                                title="Insert emoji"
                            >
                                😊
                            </button>
                            <button
                                onClick={handleSend}
                                className="bg-blue-600 dark:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                            >
                                Send
                            </button>
                        </div>
                    </div>

                    {showEmoji && (
                        <div className="mt-3">
                            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 p-2 border border-[var(--border)] rounded-xl bg-[var(--card-background)] shadow-sm max-w-[400px] sm:max-w-[520px]">
                                {['😀', '😁', '😂', '🤣', '😊', '😍', '🤝', '👍', '🙏', '🎉', '🔥', '💡', '❤️', '💙', '💜', '✨', '😎', '🤔', '🙌', '🥳', '🤖', '🧠', '🛡️', '📎', '📷', '📝', '⏳', '✅', '❌', '⚠️'].map((e) => (
                                    <button key={e} className="h-8 w-8 grid place-items-center rounded hover:bg-[var(--muted)] transition-colors" onClick={() => addEmoji(e)} type="button" title={e}>{e}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </footer>
        </div>
    );
}
