const WebSocket = require("ws");
const { WS_URL } = require("./config");

// Map to store user positions
const users = new Map();

// Generate a random 6-digit code
const authCode = Math.floor(100000 + Math.random() * 900000).toString();

// Connect to the relay server
const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  console.log("Connected to relay server");
  console.log("Authentication code:", authCode);

  // Identify this connection as the main server and send the auth code
  ws.send(
    JSON.stringify({
      type: "server_identity",
      authCode: authCode,
    })
  );
});

// Handle incoming messages from relay
ws.on("message", (message) => {
  try {
    const data = JSON.parse(message);

    // Handle authentication messages
    if (data.type === "auth") {
      ws.send(
        JSON.stringify({
          type: "auth_response",
          userId: data.userId,
          success: data.code === authCode,
        })
      );
      return;
    }

    // Only process position updates from authenticated users
    if (data.type === "position" && data.authenticated) {
      // Generate a unique ID for new users based on their first message
      if (!data.userId) {
        data.userId = Date.now().toString();
      }

      // Update user position
      users.set(data.userId, {
        x: data.x,
        y: data.y,
        lastUpdate: Date.now(),
      });

      console.log(`User ${data.userId} position updated:`, data);
      console.log(`Total connected users: ${users.size}`);

      // Send back the updated data with user ID
      ws.send(
        JSON.stringify({
          ...data,
          type: "position_update",
          allUsers: Array.from(users.entries()).map(([id, pos]) => ({
            userId: id,
            x: pos.x,
            y: pos.y,
          })),
        })
      );

      // Clean up inactive users (those who haven't updated in 10 seconds)
      const now = Date.now();
      for (const [userId, userData] of users.entries()) {
        if (now - userData.lastUpdate > 10000) {
          users.delete(userId);
          console.log(`Removed inactive user: ${userId}`);
        }
      }
    }
  } catch (error) {
    console.error("Invalid message format:", error);
  }
});

ws.on("close", () => {
  console.log("Disconnected from relay server");
  // Attempt to reconnect
  setTimeout(() => {
    console.log("Attempting to reconnect to relay...");
    ws = new WebSocket(WS_URL);
  }, 5000);
});

ws.on("error", (error) => {
  console.error("WebSocket error:", error);
});
