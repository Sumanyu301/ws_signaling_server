const WebSocket = require("ws");

// Get port from environment variable or use 8081 as default
const PORT = process.env.PORT || 8081;
const HOST = process.env.HOST || "0.0.0.0";

// Create a WebSocket server for both clients and server to connect to
const relayServer = new WebSocket.Server({
  port: PORT,
  host: HOST,
  // Add error handling for production
  clientTracking: true,
  handleProtocols: true,
});

// Keep track of connected clients and the main server
const clients = new Set();
let mainServer = null;

// Handle server errors
relayServer.on("error", (error) => {
  console.error("Relay server error:", error);
});

relayServer.on("connection", (ws) => {
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      // If this is the server identifying itself
      if (data.type === "server_identity") {
        console.log("Main server connected to relay");
        mainServer = ws;
        return;
      }

      // If this is from a client, forward to server if connected
      if (mainServer && mainServer.readyState === WebSocket.OPEN) {
        mainServer.send(message);
      }

      // If this is from the server, broadcast to all clients
      if (ws === mainServer) {
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && client !== mainServer) {
            client.send(message);
          }
        });
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  ws.on("close", () => {
    if (ws === mainServer) {
      console.log("Main server disconnected from relay");
      mainServer = null;
    } else {
      console.log("Client disconnected from relay");
      clients.delete(ws);
    }
  });

  // Add the new connection to clients set
  clients.add(ws);
});

console.log(`Relay server is running on ws://${HOST}:${PORT}`);

// Handle process termination gracefully
process.on("SIGTERM", () => {
  console.log("Shutting down relay server...");
  relayServer.close(() => {
    console.log("Relay server closed");
    process.exit(0);
  });
});
