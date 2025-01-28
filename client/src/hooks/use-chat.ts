import { useEffect, useRef, useState } from "react";
import type { Message } from "@db/schema";

export function useChat(tripId: number, userId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws?tripId=${tripId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    };

    return () => {
      ws.close();
    };
  }, [tripId]);

  const sendMessage = (content: string, isAi: boolean = false) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "message",
          tripId,
          userId,
          content,
          isAi,
        })
      );
    }
  };

  return {
    messages,
    sendMessage,
  };
}