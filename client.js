const WebSocket = require("ws");
const { WS_URL } = require("./config");
const readline = require("readline");

// Store our user ID once assigned by the server
let myUserId = null;
// Store other users' positions
const otherUsers = new Map();
// Track authentication status
let isAuthenticated = false;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Connect to the relay server
const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  console.log("Connected to server");

  // Prompt for authentication code
  rl.question("Please enter the authentication code: ", (code) => {
    // Send authentication request
    ws.send(
      JSON.stringify({
        type: "auth",
        code: code,
        userId: Date.now().toString(), // Generate temporary userId
      })
    );
  });
});

ws.on("message", (message) => {
  const data = JSON.parse(message);

  // Handle authentication response
  if (data.type === "auth_response") {
    if (data.success) {
      console.log("Authentication successful!");
      isAuthenticated = true;
      myUserId = data.userId;

      // Start sending position updates only after successful authentication
      setInterval(() => {
        const data = {
          type: "position",
          userId: myUserId,
          x: Math.random() * 100,
          y: Math.random() * 100,
        };
        ws.send(JSON.stringify(data));
      }, 200);
    } else {
      console.log(
        "Authentication failed. Please restart the client and try again."
      );
      process.exit(1);
    }
    return;
  }

  // Handle position updates only if authenticated
  if (isAuthenticated && data.type === "position_update") {
    // Update positions of all users
    if (data.allUsers) {
      data.allUsers.forEach((user) => {
        if (user.userId !== myUserId) {
          otherUsers.set(user.userId, {
            x: user.x,
            y: user.y,
          });
        }
      });

      console.log("My position:", data.x, data.y);
      console.log("Other users:", Array.from(otherUsers.entries()));
    }
  }
});

ws.on("close", () => {
  console.log("Disconnected from server");
  rl.close();
});

ws.on("error", (error) => {
  console.error("WebSocket error:", error);
  rl.close();
});
