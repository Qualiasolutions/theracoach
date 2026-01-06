import { ChatRequestSchema, MessageSchema } from '@/lib/validation';

describe('Input Validation', () => {
  describe('MessageSchema', () => {
    test('accepts valid user message', () => {
      const result = MessageSchema.safeParse({
        role: 'user',
        content: 'Hello, I want to practice!',
      });
      expect(result.success).toBe(true);
    });

    test('accepts valid assistant message', () => {
      const result = MessageSchema.safeParse({
        role: 'assistant',
        content: 'Great! Let\'s start practicing.',
      });
      expect(result.success).toBe(true);
    });

    test('rejects invalid role', () => {
      const result = MessageSchema.safeParse({
        role: 'system',
        content: 'Invalid role',
      });
      expect(result.success).toBe(false);
    });

    test('rejects empty content', () => {
      const result = MessageSchema.safeParse({
        role: 'user',
        content: '',
      });
      expect(result.success).toBe(false);
    });

    test('rejects content over 2000 characters', () => {
      const result = MessageSchema.safeParse({
        role: 'user',
        content: 'x'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    test('accepts content at 2000 characters', () => {
      const result = MessageSchema.safeParse({
        role: 'user',
        content: 'x'.repeat(2000),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ChatRequestSchema', () => {
    test('accepts valid request with messages and age', () => {
      const result = ChatRequestSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello!' }],
        userAge: 10,
      });
      expect(result.success).toBe(true);
    });

    test('accepts null age', () => {
      const result = ChatRequestSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello!' }],
        userAge: null,
      });
      expect(result.success).toBe(true);
    });

    test('rejects empty messages array', () => {
      const result = ChatRequestSchema.safeParse({
        messages: [],
        userAge: 10,
      });
      expect(result.success).toBe(false);
    });

    test('rejects more than 50 messages', () => {
      const messages = Array(51)
        .fill(null)
        .map(() => ({ role: 'user' as const, content: 'test' }));
      const result = ChatRequestSchema.safeParse({
        messages,
        userAge: 10,
      });
      expect(result.success).toBe(false);
    });

    test('rejects age below 2', () => {
      const result = ChatRequestSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello!' }],
        userAge: 1,
      });
      expect(result.success).toBe(false);
    });

    test('rejects age above 17', () => {
      const result = ChatRequestSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello!' }],
        userAge: 18,
      });
      expect(result.success).toBe(false);
    });

    test('accepts age 2 (minimum)', () => {
      const result = ChatRequestSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello!' }],
        userAge: 2,
      });
      expect(result.success).toBe(true);
    });

    test('accepts age 17 (maximum)', () => {
      const result = ChatRequestSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello!' }],
        userAge: 17,
      });
      expect(result.success).toBe(true);
    });

    test('rejects non-integer age', () => {
      const result = ChatRequestSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello!' }],
        userAge: 10.5,
      });
      expect(result.success).toBe(false);
    });
  });
});
