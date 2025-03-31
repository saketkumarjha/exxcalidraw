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
import { prismaClient } from "@repo/db/client.";
const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock user database
const users: Array<{ id: string; username: string; password: string }> = [];

// Signup Route - Fixed to not return anything
app.post("/signup", async (req: Request, res: Response, next: NextFunction) => {
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
    const { name, username, password } = validationResult.data;

    if (!username || !password) {
      res.status(400).json({ message: "Username and password are required" });
      return;
    }

    const existingUser = await prismaClient.user.findUnique({
      where: {
        username: username,
      },
    });
    if (!existingUser) {
      const newUser = {
        id: Date.now().toString(),
        username,
        password,
      };
      // Save user to the database (mocked here)
      prismaClient.user.create({
        data: {
          id: newUser.id,
          name: newUser.username,
          password: newUser.password,
        } as any,
      });
      res.status(201).json({
        message: "User created successfully",
        userId: newUser.id,
      });
    } else {
      res.status(400).json({ message: "User already exists" });
    }
  } catch (error) {
    next(error);
  }
});

// Signin Route - Fixed to not return anything
app.post("/signin", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    // Check if username and password are provided
    if (!username || !password) {
      res.status(400).json({ message: "Username and password are required" });
      return;
    }

    // Validate request body against schema
    // const validationResult = SignInSchema.safeParse(req.body);
    // if (validationResult.success) {
    //   res.status(400).json({
    //     message: "Invalid request body",
    //     errors: validationResult.error.errors,
    //   });
    //   return;
    // }

    const existingUser = await prismaClient.user.findFirst({
      where: {
        username: username,
        password: password,
      },
    });
    if (!existingUser) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    const token = jwt.sign({ id: existingUser.id }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(200).json({
      token,
      message: "User signed in successfully",
      userId: existingUser.id,
      username: existingUser.username,
      email: existingUser.email,
      name: existingUser.name,
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
      const newRoom = {
        roomId: Date.now().toString(),
        name,
        userId: req.user?.id,
      };

      prismaClient.room.create({
        data: {
          id: newRoom.roomId,
          name: newRoom.name,
          userId: newRoom.userId,
        } as any,
      });
      const roomId = newRoom.roomId;

      res.json({
        roomId,
        message: `Room created for user`,
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});

export default app;
