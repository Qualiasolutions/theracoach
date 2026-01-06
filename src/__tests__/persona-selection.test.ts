import {
  THERA_COACH_SYSTEM_PROMPT,
  TODDLER_PERSONA_OVERLAY,
  CHILD_PERSONA_OVERLAY,
  YOUTH_PERSONA_OVERLAY,
} from '@/lib/system-prompt';

/**
 * Helper to build system prompt as the API route does
 */
function buildSystemPrompt(userAge: number | null): string {
  let systemPrompt = THERA_COACH_SYSTEM_PROMPT;
  if (userAge && userAge >= 2 && userAge <= 5) {
    systemPrompt += '\n\n' + TODDLER_PERSONA_OVERLAY;
  } else if (userAge && userAge >= 6 && userAge <= 10) {
    systemPrompt += '\n\n' + CHILD_PERSONA_OVERLAY;
  } else if (userAge && userAge >= 11 && userAge <= 17) {
    systemPrompt += '\n\n' + YOUTH_PERSONA_OVERLAY;
  }
  return systemPrompt;
}

describe('Age Persona Selection', () => {
  describe('Toddler Persona (Ages 2-5)', () => {
    test.each([2, 3, 4, 5])('age %i applies toddler persona', (age) => {
      const prompt = buildSystemPrompt(age);
      expect(prompt).toContain(TODDLER_PERSONA_OVERLAY);
    });

    test('toddler persona has simplified language requirements', () => {
      const toddlerPrompt = TODDLER_PERSONA_OVERLAY.toLowerCase();
      // Should have constraints on word count or sentence length
      expect(toddlerPrompt).toMatch(/word|simple|short/);
    });

    test('toddler persona mentions emoji or visual elements', () => {
      const toddlerPrompt = TODDLER_PERSONA_OVERLAY.toLowerCase();
      expect(toddlerPrompt).toMatch(/emoji|picture|visual/);
    });
  });

  describe('Child Persona (Ages 6-10)', () => {
    test.each([6, 7, 8, 9, 10])('age %i applies child persona', (age) => {
      const prompt = buildSystemPrompt(age);
      expect(prompt).toContain(CHILD_PERSONA_OVERLAY);
    });

    test('child persona has appropriate language level', () => {
      const childPrompt = CHILD_PERSONA_OVERLAY.toLowerCase();
      // Should mention word limits or sentence structure
      expect(childPrompt).toMatch(/word|sentence|instruction/);
    });
  });

  describe('Youth Persona (Ages 11-17)', () => {
    test.each([11, 14, 17])('age %i applies youth persona', (age) => {
      const prompt = buildSystemPrompt(age);
      expect(prompt).toContain(YOUTH_PERSONA_OVERLAY);
    });

    test('youth persona uses conversational tone', () => {
      const youthPrompt = YOUTH_PERSONA_OVERLAY.toLowerCase();
      expect(youthPrompt).toMatch(/conversational|respectful|collaborative/);
    });
  });

  describe('Edge Cases', () => {
    test('boundary: age 5 uses toddler persona', () => {
      const prompt = buildSystemPrompt(5);
      expect(prompt).toContain(TODDLER_PERSONA_OVERLAY);
      expect(prompt).not.toContain(CHILD_PERSONA_OVERLAY);
    });

    test('boundary: age 6 uses child persona', () => {
      const prompt = buildSystemPrompt(6);
      expect(prompt).toContain(CHILD_PERSONA_OVERLAY);
      expect(prompt).not.toContain(TODDLER_PERSONA_OVERLAY);
    });

    test('boundary: age 10 uses child persona', () => {
      const prompt = buildSystemPrompt(10);
      expect(prompt).toContain(CHILD_PERSONA_OVERLAY);
      expect(prompt).not.toContain(YOUTH_PERSONA_OVERLAY);
    });

    test('boundary: age 11 uses youth persona', () => {
      const prompt = buildSystemPrompt(11);
      expect(prompt).toContain(YOUTH_PERSONA_OVERLAY);
      expect(prompt).not.toContain(CHILD_PERSONA_OVERLAY);
    });

    test('null age returns base prompt only', () => {
      const prompt = buildSystemPrompt(null);
      expect(prompt).toBe(THERA_COACH_SYSTEM_PROMPT);
    });

    test('age 1 (below range) returns base prompt only', () => {
      const prompt = buildSystemPrompt(1);
      expect(prompt).toBe(THERA_COACH_SYSTEM_PROMPT);
    });

    test('age 18 (above range) returns base prompt only', () => {
      const prompt = buildSystemPrompt(18);
      expect(prompt).toBe(THERA_COACH_SYSTEM_PROMPT);
    });
  });
});
