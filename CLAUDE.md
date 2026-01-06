# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Thera Coach** - An American English speech practice assistant. Gamified, evidence-based speech exercises for children (ages 5-10) and youth (ages 11-17) with fluency, articulation, and functional communication goals.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Tech Stack

- Next.js 16 (App Router, React 19, TypeScript)
- Tailwind CSS
- OpenRouter API with Gemini 2.5 Pro Preview model
- Streaming responses

## Architecture

```
src/
├── app/
│   ├── api/chat/route.ts   # OpenRouter streaming API endpoint
│   ├── page.tsx            # Main entry point
│   ├── layout.tsx          # Root layout with metadata
│   └── globals.css         # Global styles
├── components/
│   └── TheraCoach.tsx      # Main chat interface component
└── lib/
    ├── system-prompt.ts    # AI system prompt & persona overlays
    └── types.ts            # TypeScript interfaces
```

## Key Files

### `src/lib/system-prompt.ts`
Contains the core AI personality and behavioral rules:
- `THERA_COACH_SYSTEM_PROMPT` - Main system prompt with practice domains, communication rules, session structure
- `CHILD_PERSONA_OVERLAY` - Age 5-10 communication style
- `YOUTH_PERSONA_OVERLAY` - Age 11-17 communication style

### `src/app/api/chat/route.ts`
Streaming API endpoint that:
- Receives messages and user age
- Applies appropriate persona overlay based on age
- Streams responses from OpenRouter (Gemini 2.5 Pro Preview)

### `src/components/TheraCoach.tsx`
Main UI component with:
- Age selection modal on first load
- Chat interface with streaming message display
- XP tracking and streak display
- Quick action buttons (A/B/C choices, Try Again)

## Environment Variables

```env
OPENROUTER_API_KEY=   # OpenRouter API key
```

## Session Constraints

- Maximum 8 minutes per session
- One goal per session
- 2 sentences max feedback (children), 3 for teens
- Binary choices (A/B) over open-ended options
- American English spelling and vocabulary

## Practice Domains

- **Fluency**: Easy onset, prolonged speech, pausing, soft contacts, breath support
- **Articulation**: Sound isolation, syllables, minimal pairs, carryover
- **Functional**: Clear speech, turn-taking, repair strategies, role-plays

## Safety Protocols

Crisis detection is CRITICAL priority - the system prompt includes:
- Self-harm/abuse detection and response
- Redirect to trusted adults and 911/Crisis Text Line
- Session pause on crisis indicators
