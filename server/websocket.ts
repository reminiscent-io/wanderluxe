import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { db } from "@db";
import { messages } from "@db/schema";
import { parse } from "url";

interface ChatMessage {
  type: "message";
  tripId: number;
  userId: number;
  content: string;
  isAi: boolean;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const { pathname, query } = parse(request.url || "", true);

    // Ignore Vite HMR WebSocket connections
    if (request.headers["sec-websocket-protocol"]?.includes("vite-hmr")) {
      return;
    }

    // Only handle our chat WebSocket connections
    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket, req) => {
    if (!req.url) return;

    const { query } = parse(req.url, true);
    const tripId = query.tripId as string;

    if (!tripId) {
      ws.close();
      return;
    }

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString()) as ChatMessage;

        if (message.type === "message") {
          const [savedMessage] = await db
            .insert(messages)
            .values({
              tripId: message.tripId,
              userId: message.userId,
              content: message.content,
              isAi: message.isAi,
            })
            .returning();

          // Broadcast to all clients in this trip
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              client !== ws &&
              parse(client.url || "", true).query.tripId === tripId
            ) {
              client.send(JSON.stringify(savedMessage));
            }
          });
        }
      } catch (error) {
        console.error("WebSocket error:", error);
      }
    });
  });

  return wss;
}