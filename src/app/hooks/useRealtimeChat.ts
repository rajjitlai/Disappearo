'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import { sendMessage as sendMessageToDB, listMessages } from '../lib/appwrite';
import { Message } from '../lib/types';

export function useRealtimeChat(roomId: string) {
    const { socket, isConnected } = useSocket();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load initial messages
    useEffect(() => {
        if (!roomId) return;

        const loadMessages = async () => {
            try {
                const res = await listMessages(roomId);
                const docs = (res as { documents: unknown[] }).documents ?? res;
                const uniq = new Map<string, Message>();
                for (const d of docs) {
                    const message = d as Message;
                    uniq.set(message.$id, message);
                }
                const arr = Array.from(uniq.values()).sort((a, b) =>
                    new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime()
                );
                setMessages(arr);
            } catch (error) {
                console.error('Failed to load messages:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadMessages();
    }, [roomId]);

    // Join room when socket connects
    useEffect(() => {
        if (socket && isConnected && roomId) {
            socket.emit('join-room', roomId);
            console.log(`Joined room: ${roomId}`);
        }

        return () => {
            if (socket && roomId) {
                socket.emit('leave-room', roomId);
                console.log(`Left room: ${roomId}`);
            }
        };
    }, [socket, isConnected, roomId]);

    // Listen for new messages
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message: Message) => {
            console.log('Received new message:', message);
            setMessages(prev => {
                // Check for duplicates
                if (prev.some(m => m.$id === message.$id)) return prev;
                return [...prev, message].sort((a, b) =>
                    new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime()
                );
            });
        };

        socket.on('new-message', handleNewMessage);

        return () => {
            socket.off('new-message', handleNewMessage);
        };
    }, [socket]);

    // Send message function
    const sendMessage = useCallback(async (sender: string, text: string) => {
        if (!socket || !isConnected) {
            console.error('Socket not connected');
            return false;
        }

        try {
            // Send to database first
            const message = await sendMessageToDB(roomId, sender, text);

            // Then broadcast via socket
            socket.emit('send-message', {
                roomId,
                message
            });

            // Add to local state immediately for better UX
            setMessages(prev => [...prev, message].sort((a, b) =>
                new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime()
            ));

            return true;
        } catch (error) {
            console.error('Failed to send message:', error);
            return false;
        }
    }, [socket, isConnected, roomId]);

    return {
        messages,
        sendMessage,
        isConnected,
        isLoading
    };
}
