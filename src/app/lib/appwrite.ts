'use client';
import { Client, Account, Databases, ID, Query, Storage, Models, Permission, Role } from 'appwrite';

export const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const ids = {
    db: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    profile: process.env.NEXT_PUBLIC_APPWRITE_PROFILE_COLLECTION_ID!,
    chatrequests: process.env.NEXT_PUBLIC_APPWRITE_CHATREQUESTS_COLLECTION_ID!,
    chatsessions: process.env.NEXT_PUBLIC_APPWRITE_CHATSESSIONS_COLLECTION_ID!,
    messages: process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!,
    bucket: process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!,
    bad_words: process.env.NEXT_PUBLIC_APPWRITE_BAD_WORDS_COLLECTION_ID!,
    contact: process.env.NEXT_PUBLIC_APPWRITE_CONTACT_COLLECTION_ID!,
};

export async function getCurrentUser() {
    try {
        return await account.get();
    } catch {
        return null;
    }
}

export async function logout() {
    try {
        // First check if we have a valid session before trying to delete
        const currentUser = await getCurrentUser();
        if (currentUser) {
            await account.deleteSessions();
        }
    } catch {
        // Ignore errors during logout - user might already be logged out
        console.log('Logout completed (session may have already expired)');
    }
}

export async function getOrCreateProfile(user: Models.User<Models.Preferences>) {
    const existingProfile = await databases.listDocuments(ids.db, ids.profile, [
        Query.equal('userId', user.$id),
    ]);

    if (existingProfile.documents.length > 0) {
        return existingProfile.documents[0];
    }

    const handle = "user_" + Math.random().toString(36).substring(2, 8);
    const doc = await databases.createDocument(ids.db, ids.profile, ID.unique(), {
        userId: user.$id,
        handle,
        strikes: 0,
        banned: false,
    });

    return doc;
}

export async function sendMessage(sessionId: string, sender: string, text: string) {
    return await databases.createDocument(
        ids.db,
        ids.messages,
        ID.unique(),
        {
            sessionId,
            sender,
            text,
        }
    )
}

export async function listMessages(sessionId: string) {
    return await databases.listDocuments(ids.db, ids.messages, [
        Query.equal('sessionId', sessionId),
        Query.orderAsc('$createdAt'),
    ])
}

export async function updateMessage(messageId: string, data: Partial<{ text: string }>) {
    return databases.updateDocument(ids.db, ids.messages, messageId, data);
}

export async function deleteMessage(messageId: string) {
    try { await databases.deleteDocument(ids.db, ids.messages, messageId); } catch { }
}

export async function uploadImage(file: File) {
    // Basic upload; we will fetch a tokenized view URL for rendering
    const created = await storage.createFile(ids.bucket, ID.unique(), file);
    try {
        const tokenObj = await storage.createFileToken(ids.bucket, created.$id);
        const token = (tokenObj as any).token || (tokenObj as any).secret || (tokenObj as any).$id || '';
        const base = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '';
        const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT || '';
        const url = `${base}/storage/buckets/${ids.bucket}/files/${created.$id}/view?project=${project}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
        return { fileId: created.$id, url };
    } catch {
        // Fallback to non-tokenized view
        try {
            const url = storage.getFileView(ids.bucket, created.$id).toString();
            return { fileId: created.$id, url };
        } catch {
            return { fileId: created.$id, url: '' };
        }
    }
}

export async function incrementStrike(profileId: string): Promise<{ strikes: number; banned: boolean }> {
    try {
        const current = await databases.getDocument(ids.db, ids.profile, profileId);
        const prev = (current as Models.Document & { strikes?: number; lastStrikeAt?: string; bannedAt?: string }).strikes ? Number((current as Models.Document & { strikes?: number; lastStrikeAt?: string; bannedAt?: string }).strikes) : 0;
        const strikes = prev + 1;
        const now = new Date().toISOString();

        let banned = false;
        let bannedAt = null;

        if (strikes >= 3) {
            banned = true;
            bannedAt = now;
        }

        await databases.updateDocument(ids.db, ids.profile, profileId, {
            strikes,
            banned,
            bannedAt,
            lastStrikeAt: now,
        });

        return { strikes, banned };
    } catch {
        return { strikes: 1, banned: false };
    }
}

// Check and auto-unban users after 10 minutes
export async function checkAndAutoUnban(profileId: string): Promise<{ unbanned: boolean; strikes: number }> {
    try {
        const current = await databases.getDocument(ids.db, ids.profile, profileId);
        const profile = current as Models.Document & {
            strikes?: number;
            banned?: boolean;
            bannedAt?: string;
            lastStrikeAt?: string
        };

        if (!profile.banned || !profile.bannedAt) {
            return { unbanned: false, strikes: profile.strikes || 0 };
        }

        const bannedTime = new Date(profile.bannedAt).getTime();
        const now = Date.now();
        const banDuration = 10 * 60 * 1000; // 10 minutes in milliseconds

        if (now - bannedTime >= banDuration) {
            // Auto-unban and reset strikes
            await databases.updateDocument(ids.db, ids.profile, profileId, {
                strikes: 0,
                banned: false,
                bannedAt: null,
                lastStrikeAt: null,
            });
            return { unbanned: true, strikes: 0 };
        }

        return { unbanned: false, strikes: profile.strikes || 0 };
    } catch {
        return { unbanned: false, strikes: 0 };
    }
}

// Get user profile with auto-unban check
export async function getProfileWithUnbanCheck(profileId: string) {
    try {
        const unbanResult = await checkAndAutoUnban(profileId);
        const profile = await databases.getDocument(ids.db, ids.profile, profileId);

        return {
            profile,
            unbanned: unbanResult.unbanned,
            strikes: unbanResult.strikes
        };
    } catch {
        return null;
    }
}

export async function autoDeleteOldMessages(sessionId: string, olderThanMs: number) {
    const res = await databases.listDocuments(ids.db, ids.messages, [
        Query.equal('sessionId', sessionId),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
    ]);
    const now = Date.now();
    for (const m of res.documents as (Models.Document & { $createdAt?: string })[]) {
        const ts = new Date(m.$createdAt || 0).getTime();
        if (now - ts > olderThanMs) {
            try { await databases.deleteDocument(ids.db, ids.messages, m.$id); } catch { }
        }
    }
}

export async function deleteAllSessionMessages(sessionId: string) {
    const list = await databases.listDocuments(ids.db, ids.messages, [
        Query.equal('sessionId', sessionId),
        Query.limit(100),
    ]);
    for (const doc of list.documents) {
        try {
            const text = (doc as any).text as string | undefined;
            if (text && typeof text === 'string' && text.startsWith('__image__|')) {
                const parts = text.split('|');
                const fileId = parts[2];
                if (fileId) {
                    try { await storage.deleteFile(ids.bucket, fileId); } catch { }
                }
            }
        } catch { }
        // best-effort delete
        try {
            await databases.deleteDocument(ids.db, ids.messages, doc.$id);
        } catch {
            // ignore
        }
    }
}

export async function deleteImageFile(fileId: string) {
    try { await storage.deleteFile(ids.bucket, fileId); } catch { }
}

export async function deleteSession(sessionId: string) {
    try {
        await databases.deleteDocument(ids.db, ids.chatsessions, sessionId);
    } catch {
        // ignore
    }
}

export async function clearAllChatRequests() {
    try {
        const list = await databases.listDocuments(ids.db, ids.chatrequests, [
            Query.limit(100),
        ]);
        for (const doc of list.documents) {
            try {
                await databases.deleteDocument(ids.db, ids.chatrequests, doc.$id);
            } catch {
                // ignore
            }
        }
        return true;
    } catch {
        return false;
    }
}

// Custom Bad Words Management Functions
export async function addBadWord(word: string, category: string = 'general') {
    try {
        const normalizedWord = word.toLowerCase().trim();
        if (!normalizedWord) return false;

        // Check if word already exists
        const existing = await databases.listDocuments(ids.db, ids.bad_words, [
            Query.equal('word', normalizedWord),
        ]);

        if (existing.documents.length > 0) return false;

        await databases.createDocument(ids.db, ids.bad_words, ID.unique(), {
            word: normalizedWord,
            category,
            createdAt: new Date().toISOString(),
        });
        return true;
    } catch {
        return false;
    }
}

export async function removeBadWord(wordId: string) {
    try {
        await databases.deleteDocument(ids.db, ids.bad_words, wordId);
        return true;
    } catch {
        return false;
    }
}

export async function listBadWords() {
    try {
        const result = await databases.listDocuments(ids.db, ids.bad_words, [
            Query.orderDesc('$createdAt'),
            Query.limit(100),
        ]);
        return result.documents;
    } catch {
        return [];
    }
}

export async function getCustomBadWords(): Promise<string[]> {
    try {
        const result = await databases.listDocuments(ids.db, ids.bad_words, [
            Query.limit(100),
        ]);
        return result.documents.map((doc: Models.Document) => {
            const typedDoc = doc as unknown as { word: string };
            return typedDoc.word;
        }).filter(Boolean);
    } catch {
        return [];
    }
}