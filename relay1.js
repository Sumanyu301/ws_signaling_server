const WebSocket = require("ws");

// Get port from environment variable or use 8082 as default for screen sharing
const PORT = process.env.PORT || 8082;
const HOST = process.env.HOST || "0.0.0.0";

// Create a WebSocket server for screen sharing
const relayServer = new WebSocket.Server({
  port: PORT,
  host: HOST,
  clientTracking: true,
  handleProtocols: true,
  // Enable binary data transfer
  binaryType: "nodebuffer",
});

// Keep track of connected clients and their roles
const clients = new Map(); // Map to store client type (sender/viewer) and their WebSocket connection

relayServer.on("connection", (ws) => {
  console.log("New client connected");

  ws.on("message", (message) => {
    try {
      // Check if the message is binary (screen sharing data)
      if (message instanceof Buffer) {
        // Forward binary screen data to all viewers
        clients.forEach((clientData, clientWs) => {
          if (
            clientData.role === "viewer" &&
            clientWs.readyState === WebSocket.OPEN &&
            clientWs !== ws
          ) {
            clientWs.send(message);
          }
        });
        return;
      }

      // Handle JSON messages for control and setup
      const data = JSON.parse(message);

      if (data.type === "role") {
        // Store client role (sender/viewer)
        clients.set(ws, {
          role: data.role,
          userId: data.userId,
        });
        console.log(`Client registered as ${data.role}`);

        // Notify client of successful registration
        ws.send(
          JSON.stringify({
            type: "role_confirmation",
            role: data.role,
            success: true,
          })
        );
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    clients.delete(ws);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    clients.delete(ws);
  });
});

console.log(`Screen sharing relay server is running on ws://${HOST}:${PORT}`);

// Handle process termination gracefully
process.on("SIGTERM", () => {
  console.log("Shutting down relay server...");
  relayServer.close(() => {
    console.log("Relay server closed");
    process.exit(0);
  });
});
