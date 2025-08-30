'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';


export default function Home() {
  const [roomId, setRoomId] = useState('general');
  const router = useRouter();
  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 space-y-4">
        <h1 className="text-2xl font-bold">Realtime Chat</h1>
        <input
          className="w-full rounded-2xl border px-4 py-3"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="room id"
        />
        <button
          onClick={() => router.push(`/chat/${encodeURIComponent(roomId || 'general')}`)}
          className="w-full rounded-2xl bg-blue-600 text-white py-3"
        >Enter room</button>
      </div>
    </div>
  );
}