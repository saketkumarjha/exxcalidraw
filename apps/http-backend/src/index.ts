import express, { Express, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { authenticateToken } from "./middleware";
import {
  CreateRoomSchema,
  CreateUserSchema,
  SignInSchema,
} from "@repo/common/types";
const app: Express = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Mock user database
const users: Array<{ id: string; username: string; password: string }> = [];

// Signup Route - Fixed to not return anything
app.post("/signup", (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body against schema
    const validationResult = CreateUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        message: "Invalid request body",
        errors: validationResult.error.errors,
      });
      return;
    }
    const { username, password } = validationResult.data;

    // Check if user already exists
    const existingUser = users.find((user) => user.username === username);

    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }
    // Check if username and password are provided
    if (!username || !password) {
      res.status(400).json({ message: "Username and password are required" });
      return;
    }

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
    // Check if username and password are provided
    if (!username || !password) {
      res.status(400).json({ message: "Username and password are required" });
      return;
    }
    // check user credentials
    const validationResult = SignInSchema.safeParse(req.body);
    // Validate request body against schema

    if (!validationResult.success) {
      res.status(400).json({
        message: "Invalid request body",
        errors: validationResult.error.errors,
      });
      return;
    }

    // Check if user exists
    const existingUser = users.find((user) => user.username === username);
    if (!existingUser) {
      res.status(400).json({ message: "User does not exist" });
      return;
    }
    // Check if password is correct

    if (existingUser.password !== password) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    // Generate JWT token
    const token = jwt.sign({ id: existingUser.id }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(200).json({
      message: "User signed in successfully",
      token,
      userId: existingUser.id,
    });
  } catch (error) {
    next(error);
  }
});

// Protected Room Route - Fixed to not return anything
app.post(
  "/room",
  authenticateToken,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = CreateRoomSchema.safeParse(req.body);
      if (!data.success) {
        res.status(400).json({
          message: "Invalid request body",
          errors: data.error.errors,
        });
        return;
      }
      const { name } = data.data;
      // Check if room name is provided
      if (!name) {
        res.status(400).json({ message: "Room name is required" });
        return;
      }
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const userId = req.user?.id;
      const roomId = `room_${Date.now()}`;
      res.json({
        roomId,
        message: `Room created for user ${userId}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

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
