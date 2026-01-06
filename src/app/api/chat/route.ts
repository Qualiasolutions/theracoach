import { NextRequest, NextResponse } from 'next/server';
import { THERA_COACH_SYSTEM_PROMPT, TODDLER_PERSONA_OVERLAY, CHILD_PERSONA_OVERLAY, YOUTH_PERSONA_OVERLAY } from '@/lib/system-prompt';

export async function POST(request: NextRequest) {
  try {
    const { messages, userAge } = await request.json();

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
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://thera-coach.vercel.app',
        'X-Title': 'Thera Coach',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.3,
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', error);
      return NextResponse.json(
        { error: 'Failed to get response from AI' },
        { status: response.status }
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

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
