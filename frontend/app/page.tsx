"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Message = {
  id?: number;
  role: "user" | "bot";
  content: string;
  created_at?: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const connectWs = useMemo(() => {
    return () => {
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
  }, []);

  useEffect(() => {
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
  }, [connectWs]);

  const handleSend = () => {
    if (!input.trim()) return;
    // optimistically add user message
    const newMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, newMsg]);
    wsRef.current?.send(input);
    setInput("");
  };

  const handleCancel = () => {
    setInput("");
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6">
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Chatbot</h1>
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
