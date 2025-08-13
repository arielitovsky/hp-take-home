"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "./user-context";
import { 
  Message, 
  connectWebsocket, 
  fetchUser, 
  fetchMessages, 
  handleSend, 
  handleCancel 
} from "./data";

export default function Home() {
  const { user, setUser, isLoading, setIsLoading } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const connectWebsocketMemo = useMemo(() => {
    return () => connectWebsocket(user, setMessages, wsRef);
  }, [user]);

  useEffect(() => {
    // Fetch user info first
    fetchUser(setUser, setIsLoading);
  }, [setUser, setIsLoading]);

  useEffect(() => {
    if (!user) return; // Don't proceed until we have user info

    // fetch initial messages
    fetchMessages(setMessages);

    // connect websocket
    connectWebsocketMemo();

    return () => {
      wsRef.current?.close();
    };
  }, [connectWebsocketMemo, user]);

  const onSend = () => {
    handleSend(input, user, setMessages, wsRef, setInput);
  };

  const onCancel = () => {
    handleCancel(setInput);
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="text-lg">Loading...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="text-lg text-red-600">Failed to load user. Please refresh the page.</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-6">
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Chatbot</h1>
          <div className="text-sm text-gray-600">Welcome, {user.name}!</div>
        </div>
        <div className="border rounded p-3 h-[60vh] overflow-y-auto bg-white/50">
          {messages.length === 0 ? (
            <div className="text-gray-500">No messages yet.</div>
          ) : (
            <ul className="space-y-2">
              {messages.map((m, idx) => (
                <li key={`${m.id ?? "tmp"}-${idx}`} className="flex">
                  <span className={`mr-2 font-medium ${m.role === "user" ? "text-blue-600" : "text-green-700"}`}>
                    {m.role === "user" ? "You" : "Bot"}:
                  </span>
                  <span>{m.content}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2"
            placeholder="Type a message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend();
            }}
          />
          <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={onSend}>
            Send
          </button>
          <button className="px-4 py-2 rounded bg-gray-200" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </main>
  );
}
