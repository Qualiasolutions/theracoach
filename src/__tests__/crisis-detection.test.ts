import { THERA_COACH_SYSTEM_PROMPT } from '@/lib/system-prompt';

describe('Crisis Detection', () => {
  describe('System Prompt Crisis Protocol', () => {
    test('contains crisis detection keywords', () => {
      // The system prompt should contain crisis-related keywords for AI to detect
      expect(THERA_COACH_SYSTEM_PROMPT.toLowerCase()).toContain('crisis');
    });

    test('provides emergency contact numbers', () => {
      // Must include 911 for emergencies
      expect(THERA_COACH_SYSTEM_PROMPT).toContain('911');
      // Must include Crisis Text Line (741741)
      expect(THERA_COACH_SYSTEM_PROMPT).toContain('741741');
    });

    test('instructs AI to pause session on crisis indicators', () => {
      const prompt = THERA_COACH_SYSTEM_PROMPT.toLowerCase();
      // Should instruct to pause or stop during crisis
      expect(prompt).toMatch(/pause|stop|immediately/);
    });

    test('instructs referral to trusted adults', () => {
      const prompt = THERA_COACH_SYSTEM_PROMPT.toLowerCase();
      // Should mention involving adults/parents
      expect(prompt).toMatch(/adult|parent|guardian|trusted/);
    });

    test('does not provide clinical diagnoses', () => {
      // The system should explicitly avoid diagnoses
      const prompt = THERA_COACH_SYSTEM_PROMPT.toLowerCase();
      expect(prompt).toMatch(/not.*diagnos|non-diagnostic|disclaimer/);
    });
  });

  describe('Safety Boundaries', () => {
    test('system prompt has session time limits', () => {
      // Should mention 8-minute session limit
      expect(THERA_COACH_SYSTEM_PROMPT).toMatch(/8.*minute|eight.*minute/i);
    });

    test('system prompt enforces one goal per session', () => {
      expect(THERA_COACH_SYSTEM_PROMPT.toLowerCase()).toContain('one goal');
    });

    test('uses American English only', () => {
      // Should specify American English
      expect(THERA_COACH_SYSTEM_PROMPT).toMatch(/american.*english/i);
    });
  });
});
