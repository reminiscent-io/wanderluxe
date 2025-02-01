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
    const { pathname } = parse(request.url || "", true);

    // Important: Let Vite handle its own WebSocket connections
    if (request.headers["sec-websocket-protocol"]?.includes("vite-hmr") || 
        pathname?.includes("vite") ||
        pathname?.includes("__vite")) {
      return; // Allow Vite to handle its own upgrade
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

    // Send initial connection success message
    ws.send(JSON.stringify({ type: "connection", status: "connected" }));

    // Setup ping-pong for connection health check
    ws.on('pong', () => {
      ws.isAlive = true;
    });

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
      ws.isAlive = false;
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      ws.close(1011, "Internal server error");
    });
  });

  // Periodic health check and cleanup of stale connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Clean up interval on server close
  server.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}