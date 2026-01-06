import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Reset rate limiter state between tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkRateLimit', () => {
    test('allows first request', () => {
      const result = checkRateLimit('test-ip-1');
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(19);
    });

    test('allows multiple requests within limit', () => {
      const ip = 'test-ip-2';
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(ip);
        expect(result.success).toBe(true);
      }
    });

    test('blocks requests after limit exceeded', () => {
      const ip = 'test-ip-3';
      // Use up all 20 requests
      for (let i = 0; i < 20; i++) {
        checkRateLimit(ip);
      }
      // 21st request should be blocked
      const result = checkRateLimit(ip);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test('provides reset timestamp when blocked', () => {
      const ip = 'test-ip-4';
      // Exhaust limit
      for (let i = 0; i < 20; i++) {
        checkRateLimit(ip);
      }
      const result = checkRateLimit(ip);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    test('resets after window expires', () => {
      const ip = 'test-ip-5';
      // Exhaust limit
      for (let i = 0; i < 20; i++) {
        checkRateLimit(ip);
      }
      expect(checkRateLimit(ip).success).toBe(false);

      // Advance time past the window (1 minute + 1ms)
      jest.advanceTimersByTime(60001);

      // Should be allowed again
      const result = checkRateLimit(ip);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(19);
    });

    test('tracks different IPs separately', () => {
      // Exhaust limit for ip1
      for (let i = 0; i < 20; i++) {
        checkRateLimit('ip1');
      }
      expect(checkRateLimit('ip1').success).toBe(false);

      // ip2 should still be allowed
      const result = checkRateLimit('ip2');
      expect(result.success).toBe(true);
    });
  });

  describe('getClientIP', () => {
    test('extracts IP from x-forwarded-for header', () => {
      const mockRequest = {
        headers: {
          get: (name: string) =>
            name === 'x-forwarded-for' ? '192.168.1.1, 10.0.0.1' : null,
        },
      } as unknown as Request;

      expect(getClientIP(mockRequest)).toBe('192.168.1.1');
    });

    test('extracts IP from x-real-ip header', () => {
      const mockRequest = {
        headers: {
          get: (name: string) =>
            name === 'x-real-ip' ? '192.168.1.2' : null,
        },
      } as unknown as Request;

      expect(getClientIP(mockRequest)).toBe('192.168.1.2');
    });

    test('extracts IP from cf-connecting-ip header (Cloudflare)', () => {
      const mockRequest = {
        headers: {
          get: (name: string) =>
            name === 'cf-connecting-ip' ? '192.168.1.3' : null,
        },
      } as unknown as Request;

      expect(getClientIP(mockRequest)).toBe('192.168.1.3');
    });

    test('returns "anonymous" when no IP headers present', () => {
      const mockRequest = {
        headers: {
          get: () => null,
        },
      } as unknown as Request;

      expect(getClientIP(mockRequest)).toBe('anonymous');
    });

    test('prioritizes x-forwarded-for over other headers', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            switch (name) {
              case 'x-forwarded-for':
                return '192.168.1.1';
              case 'x-real-ip':
                return '192.168.2.2';
              case 'cf-connecting-ip':
                return '192.168.3.3';
              default:
                return null;
            }
          },
        },
      } as unknown as Request;

      expect(getClientIP(mockRequest)).toBe('192.168.1.1');
    });
  });
});
