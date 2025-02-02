import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { db } from "@db";
import { messages } from "@db/schema";
import { parse } from "url";

interface ChatMessage {
  type: "message";
  tripId: number;
  content: string;
  isAi: boolean;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    noServer: true,
    perMessageDeflate: false
  });

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url || "", true);

    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws: WebSocket & { isAlive?: boolean }, req) => {
    if (!req.url) {
      ws.close(1011, "Missing URL parameters");
      return;
    }

    const { query } = parse(req.url, true);
    const tripId = query.tripId as string;

    if (!tripId) {
      ws.close(1011, "Missing tripId parameter");
      return;
    }

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString()) as ChatMessage;

        if (message.type === "message") {
          const [savedMessage] = await db
            .insert(messages)
            .values({
              tripId: message.tripId,
              content: message.content,
              isAi: message.isAi,
            })
            .returning();

          // Broadcast to other clients
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(savedMessage));
            }
          });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(JSON.stringify({ 
          type: "error", 
          message: "Failed to process message" 
        }));
      }
    });

    ws.on("close", () => {
      ws.isAlive = false;
    });
  });

  // Heartbeat mechanism
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  server.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}