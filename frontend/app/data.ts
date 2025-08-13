import { useMemo } from "react";

export type Message = {
  id?: number;
  role: "user" | "bot";
  content: string;
  user_id: number;
  created_at?: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export const connectWebsocket = (
  user: any,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  wsRef: React.MutableRefObject<WebSocket | null>
) => {
  if (!user) return; // Don't connect until we have user info
  
  const ws = new WebSocket(`${wsUrl}/ws`);
  ws.onmessage = (event) => {
    try {
      const msg: Message = JSON.parse(event.data);
      setMessages((prev) => [...prev, msg]);
    } catch {
      console.error("Failed to parse message:", event.data);
    }
  };
  wsRef.current = ws;
};

export const fetchUser = async (
  setUser: (user: any) => void,
  setIsLoading: (loading: boolean) => void
) => {
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

export const fetchMessages = async (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  if (!apiUrl) return;
  const res = await fetch(`${apiUrl}/messages`, { cache: "no-store" });
  const data: Message[] = await res.json();
  setMessages(data);
};

export const handleSend = (
  input: string,
  user: any,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  wsRef: React.MutableRefObject<WebSocket | null>,
  setInput: (input: string) => void
) => {
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

export const handleCancel = (setInput: (input: string) => void) => {
  setInput("");
};
