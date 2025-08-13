"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "./user-context";

type Message = {
  id?: number;
  role: "user" | "bot";
  content: string;
  user_id: number;
  created_at?: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export default function Home() {
  const { user, setUser, isLoading, setIsLoading } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const connectWs = useMemo(() => {
    return () => {
      if (!user) return; // Don't connect until we have user info
      
      const ws = new WebSocket(`${wsUrl}/ws`);
      ws.onmessage = (event) => {
        try {
          const msg: Message = JSON.parse(event.data);
          setMessages((prev) => [...prev, msg]);
        } catch {
          // ignore
        }
      };
      wsRef.current = ws;
    };
  }, [user]);

  useEffect(() => {
    // Fetch user info first
    const fetchUser = async () => {
      try {
        const res = await fetch(`${apiUrl}/users/me`, { cache: "no-store" });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          console.error("Failed to fetch user");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [apiUrl, setUser, setIsLoading]);

  useEffect(() => {
    if (!user) return; // Don't proceed until we have user info

    // fetch initial messages
    const fetchMessages = async () => {
      if (!apiUrl) return;
      const res = await fetch(`${apiUrl}/messages`, { cache: "no-store" });
      const data: Message[] = await res.json();
      setMessages(data);
    };
    fetchMessages();

    // connect websocket
    connectWs();

    return () => {
      wsRef.current?.close();
    };
  }, [connectWs, user]);

  const handleSend = () => {
    if (!input.trim() || !user) return;
    
    // optimistically add user message
    const newMsg: Message = { 
      role: "user", 
      content: input, 
      user_id: user.id 
    };
    setMessages((prev) => [...prev, newMsg]);
    
    // Send message with user ID to backend
    const messagePayload = {
      content: input,
      user_id: user.id
    };
    wsRef.current?.send(JSON.stringify(messagePayload));
    setInput("");
  };

  const handleCancel = () => {
    setInput("");
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
              if (e.key === "Enter") handleSend();
            }}
          />
          <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={handleSend}>
            Send
          </button>
          <button className="px-4 py-2 rounded bg-gray-200" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </main>
  );
}
