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
    perMessageDeflate: false,
    clientTracking: true
  });

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url || "", true);

    if (pathname === "/ws" || pathname?.includes('@vite') || pathname?.includes('@react-refresh')) {
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

    console.log(`New WebSocket connection for trip ${tripId}`);
    ws.isAlive = true;

    ws.send(JSON.stringify({ type: "connection", status: "connected" }));

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;

    ws.on("close", () => {
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        setTimeout(() => {
          // Attempt reconnection
          const newWs = new WebSocket(ws.url);
          ws = newWs;
        }, 1000 * reconnectAttempts);
      }
    });

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
        console.error("WebSocket message error:", error);
        ws.send(JSON.stringify({ 
          type: "error", 
          message: "Failed to process message" 
        }));
      }
    });

    ws.on("close", () => {
      console.log(`Client disconnected from trip ${tripId}`);
      ws.isAlive = false;
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      ws.close(1011, "Internal server error");
    });
  });

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