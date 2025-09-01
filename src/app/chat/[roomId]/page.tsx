'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/app/state/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { client, ids, getOrCreateProfile, getCurrentUser, sendMessage, listMessages, deleteAllSessionMessages, deleteSession, uploadImage, updateMessage, incrementStrike } from '@/app/lib/appwrite';

export default function ChatPage() {
    const { user: authUser, loading: authLoading } = useAuth();
    const { roomId } = useParams();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
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
            setUser(u);
            const p = await getOrCreateProfile(u);
            setProfile(p);
        })();
    }, [authLoading, router]);

    // fetch messages
    useEffect(() => {
        if (!roomId) return;
        (async () => {
            const res = await listMessages(roomId as string);
            const docs = (res as any).documents ?? res;
            // ensure unique and sorted
            const uniq = new Map<string, any>();
            for (const d of docs) uniq.set(d.$id, d);
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
                const doc: any = res.payload;
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
                const docs = (res as any).documents ?? res;
                const hasRecent = (docs as any[]).some((m) => {
                    const ts = new Date(m.$createdAt || 0).getTime();
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
    async function moderateText(content: string) {
        try {
            const res = await fetch('/api/moderate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'text', content }),
            });
            const data = await res.json();
            return data as { ok: boolean; score?: any };
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
            if (res.banned) { alert('Your account has been banned due to repeated violations.'); return; }
            alert(`Message blocked by moderation. Strikes: ${res.strikes}/3`);
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
                    alert('Image blocked by moderation.');
                    return;
                }
            }
            if (!url) {
                alert('Image uploaded but no public URL; please update bucket permissions.');
            }
            // encode as control message to avoid schema changes
            const payload = `__image__|${encodeURIComponent(url)}|${fileId}|${encodeURIComponent(f.name)}`;
            await sendMessage(roomId as string, profile.handle, payload);
        } catch (err: any) {
            alert(err?.message || 'Failed to upload image');
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
            const t: string = (m as any).text || '';
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
            const t: string = (m as any).text || '';
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
                    .filter((m: any) => typeof m.text === 'string' && !m.text.startsWith('__export_'))
                    .map((m: any) => ({
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
                    .filter((m: any) => {
                        const t = m.text as string;
                        return typeof t === 'string' && !t.startsWith('__export_');
                    })
                    .map((m: any) => {
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
        <div className="min-h-dvh flex flex-col">
            <header className="border-b p-4 flex items-center justify-between">
                <h1 className="font-semibold">Chat</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={requestExport}
                        className="text-sm rounded-lg border px-3 py-1 hover:bg-gray-50"
                        disabled={exporting}
                    >
                        Export
                    </button>
                    <button
                        onClick={requestExportTxt}
                        className="text-sm rounded-lg border px-3 py-1 hover:bg-gray-50"
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
                            router.replace('/dashboard');
                        }}
                        className="text-sm text-gray-500"
                    >
                        Exit
                    </button>
                </div>
            </header>

            {exportState.active && (
                <div className="mx-4 mt-3 rounded-xl border bg-amber-50 text-amber-900 p-3 flex items-center justify-between">
                    <div className="text-sm">
                        Export requested by <span className="font-medium">{exportState.requestedBy}</span>. Both participants must approve to save this chat.
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={approveExport}
                            className="rounded-lg bg-amber-800 text-white text-xs px-3 py-1"
                            disabled={exporting}
                        >
                            Approve
                        </button>
                        <button
                            onClick={cancelExport}
                            className="rounded-lg border text-xs px-3 py-1"
                            disabled={exporting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {exportTxtState.active && (
                <div className="mx-4 mt-3 rounded-xl border bg-emerald-50 text-emerald-900 p-3 flex items-center justify-between">
                    <div className="text-sm">
                        TXT export requested by <span className="font-medium">{exportTxtState.requestedBy}</span>. Both participants must approve to save a readable transcript.
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={approveExportTxt}
                            className="rounded-lg bg-emerald-700 text-white text-xs px-3 py-1"
                            disabled={exporting}
                        >
                            Approve
                        </button>
                        <button
                            onClick={cancelExportTxt}
                            className="rounded-lg border text-xs px-3 py-1"
                            disabled={exporting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <main className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((msg) => {
                    const ts = (msg as any).$createdAt ? new Date((msg as any).$createdAt) : null;
                    const time = ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    const mine = msg.sender === profile?.handle;
                    const t: string = (msg as any).text ?? '';
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
                            className={`p-2 rounded-xl max-w-xs ${mine
                                ? 'ml-auto bg-indigo-600 text-white'
                                : 'mr-auto bg-gray-200 text-gray-900'
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
                                        className={`w-full rounded-md px-2 py-1 text-sm ${mine ? 'text-gray-900' : 'text-gray-900'}`}
                                        value={editingText}
                                        onChange={(e) => setEditingText(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            className={`text-[11px] rounded px-2 py-1 ${mine ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-900'}`}
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
                                            className={`text-[11px] rounded px-2 py-1 ${mine ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-900'}`}
                                            onClick={() => { setEditingId(null); setEditingText(''); }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm whitespace-pre-wrap break-words">{msg.text}</div>
                            )}
                            <div className={`text-[10px] mt-1 flex items-center gap-2 ${mine ? 'text-indigo-100/80' : 'text-gray-500'}`}>
                                <span>{msg.sender}</span>
                                {time && <span aria-hidden>•</span>}
                                {time && <time dateTime={ts!.toISOString()}>{time}</time>}
                                {withinEditWindow && !isImage && !isControl && editingId !== msg.$id && (
                                    <button
                                        className={`ml-2 underline ${mine ? 'text-indigo-100' : 'text-gray-600'}`}
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
            </main>

            <footer className="border-t p-3">
                <div className="flex gap-2 items-center">
                    <input ref={fileInputRef} onChange={handleImageSelected} type="file" accept="image/*" className="hidden" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 border rounded-xl px-3 py-2"
                    />
                    <button
                        onClick={handlePickImage}
                        className="rounded-xl px-3 py-2 border"
                        title="Send an image"
                    >
                        Image
                    </button>
                    <button
                        onClick={toggleEmoji}
                        className="rounded-xl px-3 py-2 border"
                        title="Insert emoji"
                    >
                        😊
                    </button>
                    <button
                        onClick={handleSend}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl"
                    >
                        Send
                    </button>
                </div>

                {showEmoji && (
                    <div className="mt-2 grid grid-cols-10 gap-1 p-2 border rounded-xl bg-white shadow-sm max-w-[520px]">
                        {['😀', '😁', '😂', '🤣', '😊', '😍', '🤝', '👍', '🙏', '🎉', '🔥', '💡', '❤️', '💙', '💜', '✨', '😎', '🤔', '🙌', '🥳', '🤖', '🧠', '🛡️', '📎', '📷', '📝', '⏳', '✅', '❌', '⚠️'].map((e) => (
                            <button
                                key={e}
                                className="h-8 w-8 grid place-items-center rounded hover:bg-gray-100"
                                onClick={() => addEmoji(e)}
                                type="button"
                                title={e}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                )}
            </footer>
        </div>
    );
}
