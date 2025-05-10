const WebSocket = require("ws");
const { WS_URL } = require("./config");

// Connect to the relay server
const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  console.log("Connected to relay server");

  // Identify this connection as the main server
  ws.send(
    JSON.stringify({
      type: "server_identity",
    })
  );
});

// Handle incoming messages from relay
ws.on("message", (message) => {
  try {
    const data = JSON.parse(message);

    // Validate the received data
    if (
      typeof data.type === "string" &&
      typeof data.x === "number" &&
      typeof data.y === "number"
    ) {
      console.log("Received:", data);

      // Send processed data back through relay
      ws.send(JSON.stringify(data));
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
