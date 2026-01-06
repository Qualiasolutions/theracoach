import { NextRequest, NextResponse } from 'next/server';
import { THERA_COACH_SYSTEM_PROMPT, TODDLER_PERSONA_OVERLAY, CHILD_PERSONA_OVERLAY, YOUTH_PERSONA_OVERLAY } from '@/lib/system-prompt';
import { ChatRequestSchema } from '@/lib/validation';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

// Validate API key exists at module load
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('CRITICAL: OPENROUTER_API_KEY is not configured');
}

export async function POST(request: NextRequest) {
  try {
    // Check API key configuration
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before trying again.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const validation = ChatRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { messages, userAge } = validation.data;

    // Sanitize message content (extra safety layer)
    const sanitizedMessages = messages.map(m => ({
      role: m.role,
      content: m.content.slice(0, 2000).trim(),
    }));

    // Build system prompt based on age
    let systemPrompt = THERA_COACH_SYSTEM_PROMPT;
    if (userAge && userAge >= 2 && userAge <= 5) {
      systemPrompt += '\n\n' + TODDLER_PERSONA_OVERLAY;
    } else if (userAge && userAge >= 6 && userAge <= 10) {
      systemPrompt += '\n\n' + CHILD_PERSONA_OVERLAY;
    } else if (userAge && userAge >= 11 && userAge <= 17) {
      systemPrompt += '\n\n' + YOUTH_PERSONA_OVERLAY;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://thera-coach.vercel.app',
        'X-Title': 'Thera Coach',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...sanitizedMessages,
        ],
        temperature: 0.3,
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!response.ok) {
      // Log error server-side without exposing details
      console.error('[Chat API] OpenRouter error:', response.status);
      return NextResponse.json(
        { error: 'Unable to process request. Please try again.' },
        { status: 500 }
      );
    }

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (streamError) {
          console.error('[Chat API] Stream error:', streamError);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    console.error('[Chat API] Unexpected error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 500 }
    );
  }
}
