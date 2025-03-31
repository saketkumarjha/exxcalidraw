import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

interface User {
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.sendStatus(401);
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET || "") as User;
    req.user = decoded;
    next();
  } catch (error) {
    res.sendStatus(403);
  }
}