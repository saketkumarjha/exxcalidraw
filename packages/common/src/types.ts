import { z } from "zod";

export const CreateUserSchema = z.object({
  username: z.string().min(1).max(20),
  password: z.string().min(8).max(20),
  name: z.string().min(1).max(20),
  email: z.string().email(),
});

export const SignInSchema = z.object({
  username: z.string().min(1).max(20),
  password: z.string().min(8).max(20),
});

export const CreateRoomSchema = z.object({
  name: z.string().min(1).max(20),
});
