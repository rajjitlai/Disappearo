'use client';
import { Client, Account, Databases, ID, Query } from 'appwrite';


export const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);


export const account = new Account(client);
export const databases = new Databases(client);


export const ids = {
    db: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    col: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID!,
};


export const ensureAnonSession = async () => {
    try {
        await account.get();
    } catch {
        try { await account.createAnonymousSession(); } catch (e) { console.error(e); }
    }
};


export type ChatMessage = {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    $permissions: string[];
    $databaseId: string;
    $collectionId: string;
    $sequence: number;
    text: string;
    userId: string;
    roomId: string;
};


export const listMessages = async (roomId: string) => {
    const res = await databases.listDocuments<ChatMessage>(ids.db, ids.col, [
        Query.equal('roomId', roomId),
        Query.orderAsc('$createdAt'),
    ]);
    return res.documents;
};


export const sendMessage = async (roomId: string, userId: string, text: string) => {
    return databases.createDocument(ids.db, ids.col, ID.unique(), {
        roomId, userId, text,
    });
};