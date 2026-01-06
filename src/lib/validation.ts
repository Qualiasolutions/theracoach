import { z } from 'zod';

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
});

export const ChatRequestSchema = z.object({
  messages: z
    .array(MessageSchema)
    .min(1, 'At least one message required')
    .max(50, 'Too many messages in history'),
  userAge: z.number().int().min(2).max(17).nullable(),
});

export type ValidatedChatRequest = z.infer<typeof ChatRequestSchema>;
export type ValidatedMessage = z.infer<typeof MessageSchema>;
