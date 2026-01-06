'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, UserProfile } from '@/lib/types';

// Fun practice options for toddlers with pictures
const TODDLER_ACTIVITIES = [
  { id: 'animals', emoji: '🐶', label: 'Animal Sounds', sound: 'woof woof!' },
  { id: 'vehicles', emoji: '🚗', label: 'Vroom Vroom', sound: 'beep beep!' },
  { id: 'food', emoji: '🍎', label: 'Yummy Words', sound: 'mmm!' },
  { id: 'family', emoji: '👨‍👩‍👧', label: 'Family Words', sound: 'mama!' },
];

const CHILD_ACTIVITIES = [
  { id: 'sounds', emoji: '🔤', label: 'Sound Practice' },
  { id: 'stories', emoji: '📖', label: 'Story Time' },
  { id: 'games', emoji: '🎮', label: 'Word Games' },
];

const TEEN_ACTIVITIES = [
  { id: 'articulation', emoji: '🎯', label: 'Articulation Drills' },
  { id: 'fluency', emoji: '🌊', label: 'Fluency Practice' },
  { id: 'social', emoji: '💬', label: 'Social Scenarios' },
];

export default function TheraCoach() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    age: null,
    name: '',
    xp: 0,
    streak: 0,
    sessionsCompleted: 0,
  });
  const [showAgeModal, setShowAgeModal] = useState(true);
  const [micSupported, setMicSupported] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get age group
  const getAgeGroup = () => {
    if (!userProfile.age) return 'child';
    if (userProfile.age <= 5) return 'toddler';
    if (userProfile.age <= 10) return 'child';
    return 'teen';
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          setInput(prev => {
            if (finalTranscript) {
              return (prev + ' ' + finalTranscript).trim();
            }
            return (prev.split(' ').slice(0, -1).join(' ') + ' ' + interimTranscript).trim() || interimTranscript;
          });
          setMicError(null);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setMicError('Microphone access denied. Please allow microphone in browser settings.');
          } else if (event.error === 'no-speech') {
            setMicError('No speech detected. Try again.');
          } else {
            setMicError(`Error: ${event.error}`);
          }
        };

        recognition.onaudiostart = () => {
          setMicError(null);
        };

        recognitionRef.current = recognition;
        setMicSupported(true);
      } else {
        setMicSupported(false);
      }
    }
  }, []);

  const toggleListening = async () => {
    if (!micSupported) {
      setMicError('Speech recognition not supported. Use Chrome or Edge browser.');
      return;
    }

    if (!recognitionRef.current) {
      setMicError('Speech recognition not initialized. Please refresh the page.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setInput('');
        setMicError(null);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: unknown) {
        const error = err as Error;
        if (error.name === 'NotFoundError') {
          setMicError('No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setMicError('Microphone access denied. Click the lock icon in your browser address bar to allow microphone access.');
        } else {
          setMicError(`Microphone error: ${error.message || 'Unknown error'}. Try refreshing the page.`);
        }
        console.error('Mic permission error:', err);
      }
    }
  };

  const sendInitialGreeting = useCallback(async (age: number) => {
    setIsLoading(true);
    let initialMessage = "Hi! I just started using the app.";
    if (age <= 5) {
      initialMessage = "Hi! My little one is here to practice speech sounds.";
    } else if (age <= 10) {
      initialMessage = "Hi! I just started using the app and I'm excited to practice!";
    } else {
      initialMessage = "Hey, I just opened the app and want to practice.";
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: initialMessage }],
          userAge: age,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      let assistantMessage = '';
      const assistantId = Date.now().toString();

      setMessages([{
        id: assistantId,
        role: 'assistant',
        content: '',
      }]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        setMessages([{
          id: assistantId,
          role: 'assistant',
          content: assistantMessage,
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
      const ageGroup = age <= 5 ? 'toddler' : age <= 10 ? 'child' : 'teen';
      const fallbackMessages: Record<string, string> = {
        toddler: "Hi little friend! 🌟\n\nLet's play with sounds!\n\nTap a picture to start! 👇",
        child: "Hi there! I'm Thera Coach! 🗣️\n\nWhat would you like to practice today?\n\n(A) Sound practice\n(B) Story time\n(C) Word games",
        teen: "Hey! I'm Thera Coach.\n\nWhat do you want to work on?\n\n(A) Articulation drills\n(B) Fluency practice\n(C) Social scenarios",
      };
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: fallbackMessages[ageGroup],
      }]);
    } finally {
      setIsLoading(false);
      if (age <= 5) {
        setShowActivityPicker(true);
      }
    }
  }, []);

  const handleAgeSubmit = (age: number) => {
    setUserProfile(prev => ({ ...prev, age }));
    setShowAgeModal(false);
    sendInitialGreeting(age);
  };

  const handleActivitySelect = (activity: typeof TODDLER_ACTIVITIES[0]) => {
    setShowActivityPicker(false);
    const message = `Let's practice ${activity.label.toLowerCase()}! ${activity.emoji}`;
    setInput(message);
    setTimeout(() => handleSend(), 100);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          userAge: userProfile.age,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      let assistantMessage = '';
      const assistantId = (Date.now() + 1).toString();

      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
      }]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: assistantMessage }
            : m
        ));
      }

      // Check for XP awards
      if (assistantMessage.includes('+') && assistantMessage.includes('XP')) {
        const xpMatch = assistantMessage.match(/\+(\d+)\s*XP/i);
        if (xpMatch) {
          const xpGained = parseInt(xpMatch[1]);
          setUserProfile(prev => ({ ...prev, xp: prev.xp + xpGained }));
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getAgeGroup() === 'toddler'
          ? "Oops! Let's try again! 🌟"
          : "I'm sorry, I had trouble responding. Let's try again!",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Age selection modal
  if (showAgeModal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass card-premium rounded-[32px] p-8 max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-float">🗣️</div>
            <h1 className="text-4xl font-bold text-gradient mb-2">Thera Coach</h1>
            <p className="text-navy-light text-lg">Your friendly speech practice buddy!</p>
          </div>

          <div className="space-y-6">
            <p className="text-center text-navy font-semibold text-xl">Who&apos;s practicing today?</p>

            <div className="grid grid-cols-1 gap-4">
              {/* Toddler option - biggest and most colorful */}
              <button
                onClick={() => handleAgeSubmit(4)}
                className="group p-6 rounded-3xl bg-gradient-to-r from-coral to-coral-light text-white font-bold hover:from-coral-dark hover:to-coral transition-all transform hover:scale-[1.02] shadow-xl btn-premium"
              >
                <div className="flex items-center gap-4">
                  <span className="text-5xl group-hover:animate-bounce-soft">👶</span>
                  <div className="text-left">
                    <div className="text-2xl">Little Ones</div>
                    <div className="text-sm opacity-90">Ages 2-5 • Play & Learn!</div>
                  </div>
                </div>
              </button>

              {/* Child option */}
              <button
                onClick={() => handleAgeSubmit(7)}
                className="group p-5 rounded-3xl bg-gradient-to-r from-teal to-teal-light text-white font-bold hover:from-teal-dark hover:to-teal transition-all transform hover:scale-[1.02] shadow-xl btn-premium"
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl group-hover:animate-bounce-soft">🧒</span>
                  <div className="text-left">
                    <div className="text-xl">Kids</div>
                    <div className="text-sm opacity-90">Ages 6-10 • Fun Practice!</div>
                  </div>
                </div>
              </button>

              {/* Teen option */}
              <button
                onClick={() => handleAgeSubmit(14)}
                className="group p-5 rounded-3xl bg-gradient-to-r from-lavender to-[#D6BCFA] text-white font-bold hover:from-[#9F7AEA] hover:to-lavender transition-all transform hover:scale-[1.02] shadow-xl btn-premium"
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl group-hover:animate-bounce-soft">🧑</span>
                  <div className="text-left">
                    <div className="text-xl">Teens</div>
                    <div className="text-sm opacity-90">Ages 11-17 • Skill Building</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ageGroup = getAgeGroup();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass shadow-lg px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className={`text-4xl ${ageGroup === 'toddler' ? 'animate-float' : ''}`}>🗣️</span>
          <div>
            <h1 className="text-xl font-bold text-gradient">Thera Coach</h1>
            <p className="text-xs text-navy-light">
              {ageGroup === 'toddler' ? 'Play & Learn!' : ageGroup === 'child' ? 'Speech Practice' : 'Speech Training'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-2xl ${ageGroup === 'toddler' ? 'bg-gold/20' : 'bg-teal/10'}`}>
            <div className="text-sm font-bold text-coral">⭐ {userProfile.xp} XP</div>
          </div>
          {userProfile.streak > 0 && (
            <div className="px-3 py-2 rounded-2xl bg-coral/10">
              <div className="text-xs font-bold text-coral">🔥 {userProfile.streak}</div>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] md:max-w-[75%] rounded-3xl px-5 py-4 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-teal to-teal-light text-white rounded-br-lg'
                  : 'glass card-premium text-navy rounded-bl-lg'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-coral/20">
                  <span className={`text-2xl ${ageGroup === 'toddler' ? 'animate-bounce-soft' : ''}`}>🗣️</span>
                  <span className="font-bold text-sm text-gradient">Thera Coach</span>
                </div>
              )}
              <div className={`whitespace-pre-wrap leading-relaxed ${
                ageGroup === 'toddler' ? 'text-lg' : 'text-base'
              }`}>
                {message.content}
              </div>
            </div>
          </div>
        ))}

        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="glass card-premium rounded-3xl rounded-bl-lg px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl animate-bounce-soft">🗣️</span>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 bg-coral rounded-full animate-bounce-soft" />
                  <div className="w-3 h-3 bg-teal rounded-full animate-bounce-soft" style={{ animationDelay: '150ms' }} />
                  <div className="w-3 h-3 bg-gold rounded-full animate-bounce-soft" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Toddler Activity Picker */}
      {ageGroup === 'toddler' && showActivityPicker && (
        <div className="px-4 py-3 glass border-t border-white/30">
          <p className="text-center text-navy font-bold mb-3 text-lg">Tap to play! 👇</p>
          <div className="grid grid-cols-2 gap-3">
            {TODDLER_ACTIVITIES.map((activity) => (
              <button
                key={activity.id}
                onClick={() => handleActivitySelect(activity)}
                disabled={isLoading}
                className="p-4 rounded-2xl bg-gradient-to-br from-white to-cream-dark hover:from-coral-light hover:to-coral text-navy hover:text-white transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 group"
              >
                <span className="text-4xl block mb-2 group-hover:animate-bounce-soft">{activity.emoji}</span>
                <span className="font-bold text-sm">{activity.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Child Quick Actions */}
      {ageGroup === 'child' && !showActivityPicker && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto">
          {CHILD_ACTIVITIES.map((activity) => (
            <button
              key={activity.id}
              onClick={() => {
                setInput(`I want to try ${activity.label.toLowerCase()}!`);
                setTimeout(() => handleSend(), 100);
              }}
              disabled={isLoading}
              className="px-4 py-2 glass rounded-full text-sm font-semibold text-navy hover:bg-teal hover:text-white transition-all disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
            >
              <span>{activity.emoji}</span>
              {activity.label}
            </button>
          ))}
        </div>
      )}

      {/* Teen Quick Actions */}
      {ageGroup === 'teen' && !showActivityPicker && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto">
          {TEEN_ACTIVITIES.map((activity) => (
            <button
              key={activity.id}
              onClick={() => {
                setInput(`Let's work on ${activity.label.toLowerCase()}`);
                setTimeout(() => handleSend(), 100);
              }}
              disabled={isLoading}
              className="px-4 py-2 glass rounded-full text-sm font-medium text-navy hover:bg-lavender hover:text-white transition-all disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
            >
              <span>{activity.emoji}</span>
              {activity.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="glass p-4 shadow-lg border-t border-white/30">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Main input */}
          <div className="flex gap-3">
            {/* Mic button */}
            <button
              onClick={toggleListening}
              disabled={isLoading}
              className={`p-4 rounded-full transition-all transform hover:scale-110 shadow-xl btn-premium ${
                isListening
                  ? 'bg-coral text-white animate-pulse-glow'
                  : 'bg-gradient-to-r from-coral to-coral-light text-white hover:from-coral-dark hover:to-coral'
              } disabled:opacity-50`}
              title={isListening ? 'Stop listening' : 'Start speaking'}
            >
              {isListening ? (
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            {/* Text input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? "🎤 Listening... speak now!"
                  : ageGroup === 'toddler'
                    ? "Type or tap the big red mic! 🎤"
                    : "Type or tap the mic to speak..."
              }
              disabled={isLoading}
              className={`flex-1 px-5 py-4 rounded-full border-2 focus:outline-none focus-ring text-navy text-lg ${
                isListening
                  ? 'border-coral bg-coral/5'
                  : 'border-teal/30 bg-white/80 hover:border-teal/50'
              } disabled:bg-cream-dark placeholder:text-navy-light/60`}
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="p-4 bg-gradient-to-r from-teal to-teal-light text-white rounded-full font-bold hover:from-teal-dark hover:to-teal disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-110 shadow-xl btn-premium"
            >
              {isLoading ? (
                <svg className="w-7 h-7 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>

          {/* Quick responses based on age */}
          {!isListening && ageGroup === 'toddler' && (
            <div className="flex gap-2 justify-center flex-wrap">
              {['👍 Yes!', '👎 No', '🔄 Again!', '🎉 Yay!'].map((choice) => (
                <button
                  key={choice}
                  onClick={() => {
                    setInput(choice);
                    setTimeout(() => handleSend(), 100);
                  }}
                  disabled={isLoading}
                  className="px-5 py-3 bg-white rounded-full text-lg font-bold text-navy hover:bg-gold hover:text-navy shadow-md transition-all transform hover:scale-105 disabled:opacity-50"
                >
                  {choice}
                </button>
              ))}
            </div>
          )}

          {!isListening && ageGroup !== 'toddler' && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-navy-light self-center">Quick:</span>
              {['A', 'B', 'C'].map((choice) => (
                <button
                  key={choice}
                  onClick={() => {
                    setInput(choice);
                    setTimeout(() => handleSend(), 100);
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 bg-white/80 rounded-full text-sm font-semibold text-navy hover:bg-teal hover:text-white transition-colors disabled:opacity-50"
                >
                  {choice}
                </button>
              ))}
              <button
                onClick={() => {
                  setInput("Let's try again!");
                  setTimeout(() => handleSend(), 100);
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-white/80 rounded-full text-sm font-semibold text-navy hover:bg-mint hover:text-navy transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                🔄 Again
              </button>
              <button
                onClick={() => {
                  setInput("Something different please");
                  setTimeout(() => handleSend(), 100);
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-white/80 rounded-full text-sm font-semibold text-navy hover:bg-lavender hover:text-white transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                🔀 Different
              </button>
            </div>
          )}

          {/* Listening indicator */}
          {isListening && (
            <div className="flex items-center justify-center gap-3 text-coral text-lg font-bold">
              <div className="flex gap-1 items-end">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 bg-coral rounded-full"
                    style={{
                      height: `${12 + Math.random() * 16}px`,
                      animation: `wave 0.5s ease-in-out ${i * 0.1}s infinite`,
                    }}
                  />
                ))}
              </div>
              <span>{ageGroup === 'toddler' ? "I'm listening! 👂" : "Listening... tap mic to stop"}</span>
            </div>
          )}

          {/* Error message */}
          {micError && (
            <div className="flex items-center justify-center gap-2 text-coral text-sm bg-coral/10 rounded-2xl p-3">
              <span>⚠️</span>
              <span>{micError}</span>
              <button onClick={() => setMicError(null)} className="ml-2 font-bold">✕</button>
            </div>
          )}

          {!micSupported && (
            <div className="text-center text-xs text-navy-light">
              🎤 Voice input requires Chrome or Edge browser
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}
