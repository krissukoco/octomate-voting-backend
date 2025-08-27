import { z } from 'zod';

export const createVoteSchema = z.object({
  name: z.string().min(1, 'name is required'),
})