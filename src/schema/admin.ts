import { z } from 'zod';

export const getUsersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(val => parseInt(val, 10))
    .pipe(
      z.number().min(1, 'Page must be >= 1')
    ),
  size: z
    .string()
    .optional()
    .default('10')
    .transform(val => parseInt(val, 10))
    .pipe(
      z.number().min(1, 'Size must be >= 1')
    ),
})

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username should have minimum of length 3')
})