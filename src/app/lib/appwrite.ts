'use client';
import { Client, Account, Databases, ID, Query, Storage } from 'appwrite';

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
        await account.deleteSessions();
    } catch { }
}

export async function getOrCreateProfile(user: any) {
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
    return databases.updateDocument(ids.db, ids.messages, messageId, data as any);
}

export async function deleteMessage(messageId: string) {
    try { await databases.deleteDocument(ids.db, ids.messages, messageId); } catch { }
}

export async function uploadImage(file: File) {
    const created = await storage.createFile(ids.bucket, ID.unique(), file);
    // Return a view URL (public if rules allow). Otherwise, the fileId can be used to fetch via SDK.
    try {
        const url = storage.getFileView(ids.bucket, created.$id).toString();
        return { fileId: created.$id, url };
    } catch {
        return { fileId: created.$id, url: '' };
    }
}

export async function incrementStrike(profileId: string): Promise<{ strikes: number; banned: boolean }> {
    try {
        const current = await databases.getDocument(ids.db, ids.profile, profileId);
        const prev = (current as any).strikes ? Number((current as any).strikes) : 0;
        const strikes = prev + 1;
        const banned = strikes >= 3;
        await databases.updateDocument(ids.db, ids.profile, profileId, { strikes, banned });
        return { strikes, banned };
    } catch {
        return { strikes: 1, banned: false };
    }
}

export async function autoDeleteOldMessages(sessionId: string, olderThanMs: number) {
    const res = await databases.listDocuments(ids.db, ids.messages, [
        Query.equal('sessionId', sessionId),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
    ]);
    const now = Date.now();
    for (const m of res.documents as any[]) {
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
        // best-effort delete
        try {
            // @ts-ignore Appwrite SDK types may differ at runtime
            await databases.deleteDocument(ids.db, ids.messages, doc.$id);
        } catch {
            // ignore
        }
    }
}

export async function deleteSession(sessionId: string) {
    try {
        await databases.deleteDocument(ids.db, ids.chatsessions, sessionId);
    } catch {
        // ignore
    }
}