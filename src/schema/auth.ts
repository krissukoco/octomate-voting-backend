import { z } from 'zod';

export const jwtSchema = z.object({
  aud: z.string().min(1, 'aud not valid'),
  exp: z.number(),
})

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'username is required')
    .trim(),
  password: z
    .string()
    .min(1, 'password is required')
})