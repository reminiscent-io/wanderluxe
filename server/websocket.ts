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
  const wss = new WebSocketServer({ 
    noServer: true,
    perMessageDeflate: false // Disable per-message-deflate to reduce memory usage
  });

  server.on("upgrade", (request, socket, head) => {
    // Handle socket upgrade
    const { pathname, query } = parse(request.url || "", true);

    // Important: Skip Vite HMR WebSocket connections
    if (
      request.headers["sec-websocket-protocol"]?.includes("vite-hmr") ||
      pathname?.includes("vite")
    ) {
      return;
    }

    // Only handle our chat WebSocket connections
    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      // Destroy socket for unhandled paths
      socket.destroy();
    }
  });

  wss.on("connection", (ws: WebSocket, req) => {
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

    // Send initial connection success message
    ws.send(JSON.stringify({ type: "connection", status: "connected" }));

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString()) as ChatMessage;

        if (message.type === "message") {
          // Store message in database
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
        console.error("WebSocket message error:", error);
        ws.send(JSON.stringify({ 
          type: "error", 
          message: "Failed to process message" 
        }));
      }
    });

    // Handle client disconnection
    ws.on("close", () => {
      console.log(`Client disconnected from trip ${tripId}`);
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      ws.close(1011, "Internal server error");
    });
  });

  // Periodic cleanup of stale connections
  setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      if ((ws as any).isAlive === false) {
        return ws.terminate();
      }
      (ws as any).isAlive = false;
      ws.ping();
    });
  }, 30000);

  return wss;
}