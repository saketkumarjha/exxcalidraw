import { WebSocketServer, WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { IncomingMessage } from "http";
import { prismaClient } from "@repo/db/client.";
// Create the WebSocket server
const wss = new WebSocketServer({ port: 8082 });

interface User {
  ws: WebSocket;
  userId: string;
  roomId: string[];
}

const users: User[] = [];

function checkUserAuthentication(token: string): string | null {
  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    console.log(decoded);
    return decoded.id;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

wss.on(
  "connection",
  function connection(ws: WebSocket, request: IncomingMessage) {
    console.log("WebSocket server running on port 8082");
    let activeRoom: string;
    // Parse the URL
    const url = request.url;
    if (!url) {
      console.log("Invalid URL:", url);
      ws.close();
      return;
    }

    // Extract query parameters
    const queryParameters = new URLSearchParams(url.split("?")[1] || "");
    const token = queryParameters.get("token") || "";

    try {
      // Verify and decode the token
      const userId = checkUserAuthentication(token);
      if (userId === null) {
        console.log("Authentication failed, closing connection");
        ws.close();
        return;
      }

      // Add user to the users array
      const newUser: User = {
        ws,
        userId,
        roomId: [],
      };
      users.push(newUser);

      console.log(`User ${userId} connected`);

      // Error handling
      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });

      // Message handling
      ws.on("message", async (data) => {
        try {
          const parsedData = await JSON.parse(data.toString());

          if (!parsedData || !parsedData.type) {
            console.error("Invalid message format:", data.toString());
            return;
          }
          console.log(parsedData);
          const user = users.find((u) => u.ws === ws);
          if (!user) {
            console.error("User not found");
            return;
          }

          switch (parsedData.type) {
            case "join-room":
              if (parsedData.roomId) {
                user.roomId.push(parsedData.roomId);
                console.log(
                  `User ${user.userId} joined room ${parsedData.roomId}`
                );
                activeRoom = parsedData.roomId;
                ws.send(
                  JSON.stringify({
                    type: "room-joined",
                  })
                );
              }
              break;

            case "leave-room":
              if (parsedData.roomId) {
                const index = user.roomId.indexOf(parsedData.roomId);
                if (index !== -1 && user.roomId.length > 0 && activeRoom) {
                  user.roomId.splice(index, 1);
                  console.log(
                    `User ${user.userId} left room ${parsedData.roomId}`
                  );
                }
              }
              break;

            case "send-message":
              if (parsedData.roomId && parsedData.message) {
                console.log(
                  `User ${user.userId} sent message to room ${parsedData.roomId}`
                );
                const newChat = {
                  id: Date.now().toString(),
                  roomId: activeRoom,
                  userId: user.userId,
                  message: parsedData.message,
                };

                try {
                  //store message in database
                  const savedChat = await prismaClient.chat.create({
                    data: {
                      id: newChat.id,
                      userId: newChat.userId,
                      roomId: newChat.roomId,
                      message: newChat.message,
                    },
                  });
                  console.log("Message stored in database", savedChat);

                  // Broadcast the message to all users in the room
                  users.forEach((u) => {
                    if (u.roomId.includes(parsedData.roomId)) {
                      u.ws.send(
                        JSON.stringify({
                          type: "receive-message",
                          id: newChat.id,
                          message: parsedData.message,
                          sender: user.userId,
                          roomId: parsedData.roomId,
                          timestamp: new Date().toISOString(),
                        })
                      );
                    }
                  });
                } catch (error) {
                  console.error("Failed to store message in database:", error);
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: "Failed to send message",
                    })
                  );
                }
              }
              break;

            default:
              console.log("Unknown message type:", parsedData.type);
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      });

      // Clean up when connection closes
      ws.on("close", () => {
        const index = users.findIndex((u) => u.ws === ws);
        if (index !== -1) {
          // console.log(`User ${users[index].userId} disconnected`);
          users.splice(index, 1);
        }
      });

      // Send initial message
      ws.send(
        JSON.stringify({
          type: "connected",
          userId,
        })
      );
    } catch (error) {
      console.error("Connection handling error:", error);
      ws.close();
    }
  }
);

// Handle server-level errors
wss.on("error", (error) => {
  console.error("WebSocket server error:", error);
});
