'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/app/state/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { client, ids, storage, getOrCreateProfile, getCurrentUser, sendMessage, listMessages, deleteAllSessionMessages, deleteSession, uploadImage, incrementStrike } from '@/app/lib/appwrite';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { Message, Profile } from '@/app/lib/types';
// import { Filter } from 'content-checker'; // Removed - using server-side moderation

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
    // Editing disabled to avoid bypassing moderation
    const inputRef = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inactivityTimerRef = useRef<null | ReturnType<typeof setInterval>>(null);
    const router = useRouter();
    const [exporting, setExporting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadingImageName, setUploadingImageName] = useState<string | null>(null);
    // Note: Client-side Filter removed - image moderation now handled server-side
    const sendingRef = useRef(false);
    const lastDownloadedReqId = useRef<string | null>(null);
    const unsubRef = useRef<(() => void) | null>(null);

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

    // load initial messages and subscribe via Appwrite Realtime
    useEffect(() => {
        if (!roomId) return;
        (async () => {
            try {
                const res = await listMessages(roomId as string);
                const docs = (res as { documents: unknown[] }).documents ?? res;
                const uniq = new Map<string, Message>();
                for (const d of docs) {
                    const message = d as Message;
                    uniq.set(message.$id, message);
                }
                const arr = Array.from(uniq.values()).sort((a, b) =>
                    new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime()
                );
                console.log('Loaded messages:', arr);
                // Debug image messages
                arr.forEach(msg => {
                    if (msg.text && msg.text.startsWith('__image__|')) {
                        console.log('Found image message:', msg);
                    }
                });
                setMessages(arr);
            } catch {
                // ignore initial load errors
            }
        })();

        const unsubscribe = client.subscribe(
            `databases.${ids.db}.collections.${ids.messages}.documents`,
            (res) => {
                const doc: Message = res.payload as unknown as Message;
                if (doc.sessionId !== roomId) return;
                const isCreate = res.events.some((e: string) => e.endsWith('.create'));
                const isDelete = res.events.some((e: string) => e.endsWith('.delete'));
                const isUpdate = res.events.some((e: string) => e.endsWith('.update'));
                setMessages((prev) => {
                    if (isDelete) return prev.filter((m) => m.$id !== doc.$id);
                    if (isUpdate) return prev.map((m) => (m.$id === doc.$id ? doc : m));
                    if (isCreate) {
                        if (prev.some((m) => m.$id === doc.$id)) return prev;
                        console.log('New message received:', doc);
                        if (doc.text && doc.text.startsWith('__image__|')) {
                            console.log('New image message received:', doc);
                        }
                        return [...prev, doc].sort((a, b) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime());
                    }
                    return prev;
                });
            }
        );
        return () => {
            try { unsubscribe(); } catch { }
        };
    }, [roomId]);

    // subscribe to session lifecycle; if session is deleted by the other participant, exit cleanly
    useEffect(() => {
        if (!roomId) return;
        const channel = `databases.${ids.db}.collections.${ids.chatsessions}.documents.${roomId}`;
        const unsubscribe = client.subscribe(channel, (res) => {
            const wasDeleted = res.events?.some((e: string) => e.endsWith('.delete'));
            if (wasDeleted) {
                // other participant ended the chat; clean local timers and redirect
                if (unsubRef.current) {
                    try { unsubRef.current(); } catch { }
                    unsubRef.current = null;
                }
                if (inactivityTimerRef.current) {
                    clearInterval(inactivityTimerRef.current);
                    inactivityTimerRef.current = null;
                }
                toast('Chat ended by the other participant');
                router.replace('/dashboard');
            }
        });
        unsubRef.current = unsubscribe;
        return () => {
            try { unsubscribe(); } catch { }
        };
    }, [roomId, router]);

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
        if (sendingRef.current) return; // prevent double-clicks
        sendingRef.current = true;
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
            // Update profile state with new strike count
            setProfile(prev => prev ? { ...prev, strikes: res.strikes } : null);
            toast.error(`Message blocked. Strikes: ${res.strikes}/3`);
            sendingRef.current = false;
            return;
        }
        try {
            const success = await sendMessage(roomId as string, profile.handle, content);
            if (success) {
                setText('');
            } else {
                toast.error('Failed to send message. Please try again.');
            }
        } catch (err: unknown) {
            const error = err as Error;
            toast.error(error?.message || 'Failed to send message. Please try again.');
        } finally {
            sendingRef.current = false;
        }
    }

    async function handlePickImage() {
        fileInputRef.current?.click();
    }

    async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f || !profile) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        if (!allowedTypes.includes(f.type)) {
            toast.error(`Invalid file type: ${f.type}. Please select an image file.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
        if (f.size > MAX_IMAGE_BYTES) {
            toast.error('Image is larger than 10MB');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        try {
            setUploading(true);
            setUploadingImageName(f.name);

            console.log('Starting image upload:', { name: f.name, size: f.size, type: f.type });

            // Note: Client-side image moderation removed due to CORS issues
            // Image moderation is now handled server-side after upload
            console.log('Skipping client-side image moderation (handled server-side)');

            const { url, fileId } = await uploadImage(f);

            if (!fileId) {
                throw new Error('Failed to upload image - no file ID returned');
            }

            console.log('Image uploaded successfully:', { fileId, url });

            // Server-side image moderation after upload
            try {
                console.log('Running server-side image moderation...');

                // Convert file to base64 for sending to server
                const fileData = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(f);
                });

                const moderationResponse = await fetch('/api/moderate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'image',
                        fileData: fileData,
                        fileName: f.name,
                        fileType: f.type
                    })
                });

                const moderationResult = await moderationResponse.json();
                console.log('Server-side moderation result:', moderationResult);

                if (!moderationResult.ok) {
                    console.log('Image blocked by server-side moderation:', moderationResult);

                    // Increment strike for blocked image
                    if (profile) {
                        const res = await incrementStrike(profile.$id);
                        if (res.banned) {
                            toast.error('Banned due to repeated violations. Your account has been suspended.');
                            // Delete current chat and redirect to dashboard
                            await deleteAllSessionMessages(roomId as string);
                            await deleteSession(roomId as string);
                            router.replace('/dashboard');
                            return;
                        }
                        // Update profile state with new strike count
                        setProfile(prev => prev ? { ...prev, strikes: res.strikes } : null);
                        toast.error(`Image blocked. Strikes: ${res.strikes}/3`);
                    } else {
                        toast.error(`Image blocked by server: ${moderationResult.reason || 'NSFW content detected'}`);
                    }

                    setUploading(false);
                    setUploadingImageName(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    return;
                } else if (moderationResult.reason === 'api_error') {
                    console.log('OpenModerator API error detected:', moderationResult);
                    toast('Image uploaded (moderation API unavailable - check quota)', {
                        icon: '⚠️',
                        duration: 4000
                    });
                }
            } catch (serverErr) {
                console.warn('Server-side image moderation failed, proceeding with message:', serverErr);
            }

            if (!url) {
                console.warn('No URL generated for uploaded image');
                toast('Uploaded, but bucket lacks public view permissions');
            }

            // encode as control message to avoid schema changes
            const payload = `__image__|${encodeURIComponent(url || '')}|${fileId}|${encodeURIComponent(f.name)}`;
            console.log('Sending image message with payload:', payload);

            const success = await sendMessage(roomId as string, profile.handle, payload);
            if (!success) {
                toast.error('Failed to send image message');
            } else {
                console.log('Image message sent successfully');
                toast.success('Image sent successfully');
            }
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Image upload error:', error);
            toast.error(error?.message || 'Failed to upload image');
        } finally {
            setUploading(false);
            setUploadingImageName(null);
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
            lastDownloadedReqId.current !== exportState.reqId &&
            // Only the requester should receive the export
            profile.handle === exportState.requestedBy
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
            lastDownloadedReqId.current !== `txt:${exportTxtState.reqId}` &&
            // Only the requester should receive the export
            profile.handle === exportTxtState.requestedBy
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
            <header className="border-b border-[var(--border)] bg-[var(--card-background)] sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-600/10 text-blue-700 dark:text-blue-200 grid place-items-center font-semibold">
                            {profile?.handle?.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="font-semibold leading-none">Chat</h1>
                            <p className="text-[10px] text-[var(--muted-foreground)]">Ephemeral • Private</p>
                        </div>
                    </div>
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
                                // Delete the session first so the other participant is kicked out immediately
                                await deleteSession(roomId as string);
                                // Then perform best-effort cleanup of messages
                                await deleteAllSessionMessages(roomId as string);
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

            {/* Info notice (blend with background) */}
            <div className="max-w-5xl mx-auto px-4 mt-2 text-[10px] sm:text-xs text-[var(--muted-foreground)]">
                <div className="px-3 py-2">
                    <span className="font-medium">Privacy notice:</span> Messages are ephemeral and private to participants, and will be cleared when the session exits. AI moderation may delay delivery briefly.
                </div>
            </div>

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
                        const isControl = false; // editing/export control UI not used here
                        let imageUrl = '';
                        let imageName = '';
                        let imageFileId = '';
                        if (isImage) {
                            const parts = t.split('|');
                            imageUrl = decodeURIComponent(parts[1] || '');
                            imageFileId = parts[2] || '';
                            imageName = decodeURIComponent(parts[3] || 'image');

                            console.log('Image message debug:', {
                                originalText: t,
                                parts,
                                imageUrl,
                                imageFileId,
                                imageName
                            });

                            // If URL is empty but we have fileId, try to construct URL
                            if (!imageUrl && imageFileId) {
                                try {
                                    imageUrl = storage.getFileView(ids.bucket, imageFileId).toString();
                                    console.log('Constructed image URL from fileId:', imageUrl);
                                } catch (urlError) {
                                    console.warn('Failed to construct image URL from fileId:', urlError);
                                }
                            }
                        }
                        const withinEditWindow = false;
                        return (
                            <div key={msg.$id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex items-end gap-2 max-w-[80%]`}>
                                    {!mine && (
                                        <div className="h-7 w-7 rounded-full bg-gray-300 dark:bg-gray-700 grid place-items-center text-[10px] text-gray-700 dark:text-gray-300">
                                            {msg.sender.slice(0, 1).toUpperCase()}
                                        </div>
                                    )}
                                    <div className={`p-3 rounded-2xl shadow-sm ${mine
                                        ? 'bg-blue-600 dark:bg-blue-700 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                                        }`}>
                                        {isImage ? (
                                            <div className="rounded-lg overflow-hidden">
                                                {imageUrl ? (
                                                    <Image
                                                        src={imageUrl}
                                                        alt={imageName}
                                                        width={640}
                                                        height={480}
                                                        className="block w-full h-auto pointer-events-none select-none"
                                                        draggable={false}
                                                        onContextMenu={(ev) => ev.preventDefault()}
                                                        onLoad={() => {
                                                            console.log('Image loaded successfully:', imageUrl);
                                                        }}
                                                        onError={(e) => {
                                                            console.error('Image failed to load:', imageUrl);
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            const errorDiv = document.createElement('div');
                                                            errorDiv.className = 'p-4 text-center text-gray-500 bg-gray-100 dark:bg-gray-800 rounded';
                                                            errorDiv.textContent = 'Image failed to load';
                                                            target.parentNode?.appendChild(errorDiv);
                                                        }}
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="p-4 text-center text-gray-500 bg-gray-100 dark:bg-gray-800 rounded">
                                                        <p>Image unavailable</p>
                                                        {imageFileId && (
                                                            <p className="text-xs mt-1">File ID: {imageFileId}</p>
                                                        )}
                                                        <p className="text-xs mt-1">Original URL: {imageUrl || 'Empty'}</p>
                                                        <p className="text-xs mt-1">Message text: {t}</p>
                                                        {imageFileId && (
                                                            <button
                                                                className="text-xs mt-2 px-2 py-1 bg-blue-500 text-white rounded"
                                                                onClick={() => {
                                                                    const testUrl = storage.getFileView(ids.bucket, imageFileId).toString();
                                                                    console.log('Manual URL test:', testUrl);
                                                                    window.open(testUrl, '_blank');
                                                                }}
                                                            >
                                                                Test URL
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-sm whitespace-pre-wrap break-words">{msg.text}</div>
                                        )}
                                        <div className={`text-[10px] mt-2 flex items-center gap-2 ${mine
                                            ? 'text-blue-100/80'
                                            : 'text-gray-500 dark:text-gray-400'
                                            }`}>
                                            <span className="truncate max-w-[120px]">{msg.sender}</span>
                                            {time && <span aria-hidden>•</span>}
                                            {time && <time dateTime={ts!.toISOString()}>{time}</time>}
                                            {/* Editing disabled */}
                                        </div>
                                    </div>
                                    {mine && (
                                        <div className="h-7 w-7 rounded-full bg-blue-600/10 text-blue-700 dark:text-blue-200 grid place-items-center text-[10px]">
                                            {profile?.handle?.slice(0, 1).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={bottomRef} />
                </div>
            </main>

            <footer className="border-t border-[var(--border)] bg-[var(--card-background)] sticky bottom-0 z-10">
                <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <div className="flex gap-2 items-center w-full">
                            <input ref={fileInputRef} onChange={handleImageSelected} type="file" accept="image/*" className="hidden" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 border border-[var(--border)] rounded-full px-4 py-3 bg-[var(--input-background)] text-[var(--input-foreground)] placeholder-[var(--muted-foreground)] text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            />
                            <button
                                onClick={handlePickImage}
                                className="rounded-lg px-2 sm:px-3 py-2 border border-[var(--border)] text-xs sm:text-sm hover:bg-[var(--muted)] transition-colors disabled:opacity-50"
                                title="Send an image"
                                disabled={uploading}
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
                                className="bg-blue-600 dark:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
                                disabled={uploading}
                            >
                                Send
                            </button>
                        </div>
                    </div>

                    {uploading && uploadingImageName && (
                        <div className="mt-2 px-3 sm:px-4">
                            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span>Uploading {uploadingImageName}...</span>
                            </div>
                        </div>
                    )}

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
