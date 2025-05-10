const WebSocket = require("ws");
const { WS_URL } = require("./config");

// Connect to the relay server
const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  console.log("Connected to server");

  // Example: Send a position update every 2 seconds
  setInterval(() => {
    const data = {
      type: "position",
      x: Math.random() * 100, // Random x position between 0-100
      y: Math.random() * 100, // Random y position between 0-100
    };
    ws.send(JSON.stringify(data));
  }, 200);
});

ws.on("message", (message) => {
  const data = JSON.parse(message);
  console.log("Received from server:", data);
});

ws.on("close", () => {
  console.log("Disconnected from server");
});

ws.on("error", (error) => {
  console.error("WebSocket error:", error);
});
