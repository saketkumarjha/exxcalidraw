import express, { Express, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import {JWT_SECRET} from "@repo/backend-common/config";  
import { authenticateToken } from "./middleware";

const app: Express = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Mock user database
const users: Array<{ id: string; username: string; password: string }> = [];

// Signup Route - Fixed to not return anything
app.post("/signup", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: "Username and password are required" });
      return;
    }

    const existingUser = users.find((user) => user.username === username);
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const newUser = {
      id: Date.now().toString(),
      username,
      password,
    };

    users.push(newUser);
    res.status(201).json({
      message: "User created successfully",
      userId: newUser.id,
    });
  } catch (error) {
    next(error);
  }
});

// Signin Route - Fixed to not return anything
app.post("/signin", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;

    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });
    res.json({
      token,
      userId: user.id,
    });
  } catch (error) {
    next(error);
  }
});

// Protected Room Route - Fixed to not return anything
app.post("/room", authenticateToken, (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const roomId = `room_${Date.now()}`;
    res.json({
      roomId,
      message: `Room created for user ${userId}`,
    });
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;