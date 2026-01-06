'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, UserProfile, SpeechRecognitionEvent, SpeechRecognitionErrorEvent, SpeechRecognition as SpeechRecognitionType } from '@/lib/types';

// Speaker icon component
const SpeakerIcon = ({ isMuted, size = 20 }: { isMuted?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
    {isMuted ? (
      <path d="M23 9l-6 6M17 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <>
        <path d="M15.54 8.46a5 5 0 010 7.07" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19.07 4.93a10 10 0 010 14.14" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </svg>
);

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

  // TTS state
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);
  const [ttsSupported, setTtsSupported] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get age group
  const getAgeGroup = useCallback(() => {
    if (!userProfile.age) return 'child';
    if (userProfile.age <= 5) return 'toddler';
    if (userProfile.age <= 10) return 'child';
    return 'teen';
  }, [userProfile.age]);

  // Initialize TTS
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthRef.current = window.speechSynthesis;
      setTtsSupported(true);

      // Load voices
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    } else {
      setTtsSupported(false);
    }

    return () => {
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
      }
    };
  }, []);

  // Speak text function
  const speakText = useCallback((text: string, messageId?: string) => {
    if (!speechSynthRef.current || !ttsSupported || !ttsEnabled) return;

    // Cancel any ongoing speech
    speechSynthRef.current.cancel();

    // Clean text for speech (remove emojis, markdown, etc.)
    const cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
      .replace(/\*\*/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\(([A-C])\)/g, 'Option $1:')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Get voices and select appropriate one
    const voices = speechSynthRef.current.getVoices();
    const preferredVoices = voices.filter(v =>
      v.lang.startsWith('en-US') &&
      (v.name.includes('Samantha') ||
       v.name.includes('Google') ||
       v.name.includes('Microsoft') ||
       v.name.toLowerCase().includes('female'))
    );

    if (preferredVoices.length > 0) {
      utterance.voice = preferredVoices[0];
    } else {
      const usVoice = voices.find(v => v.lang.startsWith('en-US'));
      if (usVoice) utterance.voice = usVoice;
    }

    // Adjust rate and pitch based on age group
    const ageGroup = getAgeGroup();
    switch (ageGroup) {
      case 'toddler':
        utterance.rate = 0.75; // Slower for little ones
        utterance.pitch = 1.2; // Slightly higher pitch
        break;
      case 'child':
        utterance.rate = 0.85;
        utterance.pitch = 1.1;
        break;
      case 'teen':
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        break;
    }

    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (messageId) setCurrentSpeakingId(messageId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    };

    speechSynthRef.current.speak(utterance);
  }, [ttsEnabled, ttsSupported, getAgeGroup]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
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

          const newTranscript = finalTranscript || interimTranscript;

          setInput(prev => {
            if (finalTranscript) {
              const updated = (prev + ' ' + finalTranscript).trim();
              lastTranscriptRef.current = updated;
              return updated;
            }
            return (prev.split(' ').slice(0, -1).join(' ') + ' ' + interimTranscript).trim() || interimTranscript;
          });
          setMicError(null);

          // Auto-send after 2 seconds of silence when we have final transcript
          if (finalTranscript && newTranscript.trim()) {
            if (autoSendTimeoutRef.current) {
              clearTimeout(autoSendTimeoutRef.current);
            }
            autoSendTimeoutRef.current = setTimeout(() => {
              if (lastTranscriptRef.current.trim() && recognitionRef.current) {
                recognitionRef.current.stop();
                // Trigger send after a short delay to ensure state is updated
                setTimeout(() => {
                  const sendButton = document.querySelector('[data-send-button]') as HTMLButtonElement;
                  if (sendButton && !sendButton.disabled) {
                    sendButton.click();
                  }
                }, 100);
              }
            }, 2000); // 2 second pause triggers auto-send
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          // Clear auto-send timeout when recognition ends
          if (autoSendTimeoutRef.current) {
            clearTimeout(autoSendTimeoutRef.current);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
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
    // Stop TTS if speaking when user starts to talk
    if (isSpeaking) {
      stopSpeaking();
    }

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
        if (err instanceof Error) {
          if (err.name === 'NotFoundError') {
            setMicError('No microphone found. Please connect a microphone and try again.');
          } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setMicError('Microphone access denied. Click the lock icon in your browser address bar to allow microphone access.');
          } else {
            setMicError(`Microphone error: ${err.message || 'Unknown error'}. Try refreshing the page.`);
          }
          console.error('Mic permission error:', err);
        } else {
          setMicError('An unknown error occurred. Please try again.');
        }
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

      // Auto-speak the response after streaming completes
      if (ttsEnabled && assistantMessage) {
        setTimeout(() => speakText(assistantMessage, assistantId), 500);
      }
    } catch (error) {
      console.error('Error:', error);
      const ageGroup = age <= 5 ? 'toddler' : age <= 10 ? 'child' : 'teen';
      const fallbackMessages: Record<string, string> = {
        toddler: "Hi little friend! Let's play with sounds! Tap a picture to start!",
        child: "Hi there! I'm Thera Coach! What would you like to practice today? Option A: Sound practice. Option B: Story time. Option C: Word games.",
        teen: "Hey! I'm Thera Coach. What do you want to work on? Option A: Articulation drills. Option B: Fluency practice. Option C: Social scenarios.",
      };
      const fallbackMessage = fallbackMessages[ageGroup];
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: fallbackMessage,
      }]);
      if (ttsEnabled) {
        setTimeout(() => speakText(fallbackMessage), 500);
      }
    } finally {
      setIsLoading(false);
      if (age <= 5) {
        setShowActivityPicker(true);
      }
    }
  }, [speakText, ttsEnabled]);

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

    // Stop TTS if speaking
    if (isSpeaking) {
      stopSpeaking();
    }

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

      // Auto-speak the response after streaming completes
      if (ttsEnabled && assistantMessage) {
        setTimeout(() => speakText(assistantMessage, assistantId), 300);
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
      const errorMsg = getAgeGroup() === 'toddler'
        ? "Oops! Let's try again!"
        : "I'm sorry, I had trouble responding. Let's try again!";
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMsg,
      }]);
      if (ttsEnabled) {
        speakText(errorMsg);
      }
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
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4">
        <div className="glass card-premium rounded-2xl sm:rounded-[32px] p-4 sm:p-6 md:p-8 max-w-lg w-full mx-2">
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <div className="text-5xl sm:text-6xl md:text-7xl mb-2 sm:mb-4 animate-float">🗣️</div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient mb-1 sm:mb-2">Thera Coach</h1>
            <p className="text-navy-light text-sm sm:text-base md:text-lg">Your friendly speech practice buddy!</p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <p className="text-center text-navy font-semibold text-base sm:text-lg md:text-xl">Who&apos;s practicing today?</p>

            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {/* Toddler option - biggest and most colorful */}
              <button
                onClick={() => handleAgeSubmit(4)}
                className="group p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-coral to-coral-light text-white font-bold hover:from-coral-dark hover:to-coral transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl btn-premium touch-target"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="text-4xl sm:text-5xl group-hover:animate-bounce-soft">👶</span>
                  <div className="text-left">
                    <div className="text-lg sm:text-xl md:text-2xl">Little Ones</div>
                    <div className="text-xs sm:text-sm opacity-90">Ages 2-5 • Play & Learn!</div>
                  </div>
                </div>
              </button>

              {/* Child option */}
              <button
                onClick={() => handleAgeSubmit(7)}
                className="group p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-teal to-teal-light text-white font-bold hover:from-teal-dark hover:to-teal transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl btn-premium touch-target"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="text-3xl sm:text-4xl group-hover:animate-bounce-soft">🧒</span>
                  <div className="text-left">
                    <div className="text-base sm:text-lg md:text-xl">Kids</div>
                    <div className="text-xs sm:text-sm opacity-90">Ages 6-10 • Fun Practice!</div>
                  </div>
                </div>
              </button>

              {/* Teen option */}
              <button
                onClick={() => handleAgeSubmit(14)}
                className="group p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-lavender to-[#D6BCFA] text-white font-bold hover:from-[#9F7AEA] hover:to-lavender transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl btn-premium touch-target"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="text-3xl sm:text-4xl group-hover:animate-bounce-soft">🧑</span>
                  <div className="text-left">
                    <div className="text-base sm:text-lg md:text-xl">Teens</div>
                    <div className="text-xs sm:text-sm opacity-90">Ages 11-17 • Skill Building</div>
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
      <header className="glass shadow-lg px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between sticky top-0 z-10 safe-area-inset-top">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className={`text-2xl sm:text-3xl md:text-4xl ${ageGroup === 'toddler' ? 'animate-float' : ''}`}>🗣️</span>
          <div>
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-gradient">Thera Coach</h1>
            <p className="text-[10px] sm:text-xs text-navy-light hidden xs:block">
              {ageGroup === 'toddler' ? 'Play & Learn!' : ageGroup === 'child' ? 'Speech Practice' : 'Speech Training'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* TTS Toggle */}
          {ttsSupported && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setTtsEnabled(!ttsEnabled);
              }}
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all touch-target ${
                ttsEnabled
                  ? 'bg-teal/20 text-teal-dark'
                  : 'bg-gray-100 text-gray-400'
              }`}
              title={ttsEnabled ? 'Voice enabled - click to mute' : 'Voice muted - click to enable'}
            >
              <SpeakerIcon isMuted={!ttsEnabled} size={18} />
            </motion.button>
          )}
          <div className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl ${ageGroup === 'toddler' ? 'bg-gold/20' : 'bg-teal/10'}`}>
            <div className="text-xs sm:text-sm font-bold text-coral">✨ {userProfile.xp}</div>
          </div>
          {userProfile.streak > 0 && (
            <div className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-coral/10">
              <div className="text-[10px] sm:text-xs font-bold text-coral">🔥 {userProfile.streak}</div>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[95%] sm:max-w-[90%] md:max-w-[75%] rounded-2xl sm:rounded-3xl px-3 sm:px-5 py-3 sm:py-4 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-teal to-teal-light text-white rounded-br-lg'
                  : 'glass card-premium text-navy rounded-bl-lg'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3 pb-2 border-b border-coral/20">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className={`text-xl sm:text-2xl ${ageGroup === 'toddler' ? 'animate-bounce-soft' : ''}`}>🗣️</span>
                    <span className="font-bold text-xs sm:text-sm text-gradient">Thera Coach</span>
                  </div>
                  {/* Speaker button for this message */}
                  {ttsSupported && message.content && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (currentSpeakingId === message.id) {
                          stopSpeaking();
                        } else {
                          speakText(message.content, message.id);
                        }
                      }}
                      className={`p-1.5 rounded-lg transition-all ${
                        currentSpeakingId === message.id
                          ? 'bg-coral/20 text-coral animate-pulse'
                          : 'bg-teal/10 text-teal hover:bg-teal/20'
                      }`}
                      title={currentSpeakingId === message.id ? 'Stop speaking' : 'Play message'}
                    >
                      {currentSpeakingId === message.id ? (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      ) : (
                        <SpeakerIcon isMuted={false} size={16} />
                      )}
                    </motion.button>
                  )}
                </div>
              )}
              <div className={`whitespace-pre-wrap leading-relaxed ${
                ageGroup === 'toddler' ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
              }`}>
                {message.content}
              </div>
            </div>
          </div>
        ))}

        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="glass card-premium rounded-2xl sm:rounded-3xl rounded-bl-lg px-3 sm:px-5 py-3 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xl sm:text-2xl animate-bounce-soft">🗣️</span>
                <div className="flex gap-1 sm:gap-1.5">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-coral rounded-full animate-bounce-soft" />
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-teal rounded-full animate-bounce-soft" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gold rounded-full animate-bounce-soft" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Toddler Activity Picker */}
      {ageGroup === 'toddler' && showActivityPicker && (
        <div className="px-2 sm:px-4 py-2 sm:py-3 glass border-t border-white/30">
          <p className="text-center text-navy font-bold mb-2 sm:mb-3 text-base sm:text-lg">Tap to play! 👇</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {TODDLER_ACTIVITIES.map((activity) => (
              <button
                key={activity.id}
                onClick={() => handleActivitySelect(activity)}
                disabled={isLoading}
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white to-cream-dark hover:from-coral-light hover:to-coral text-navy hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 group touch-target"
              >
                <span className="text-3xl sm:text-4xl block mb-1 sm:mb-2 group-hover:animate-bounce-soft">{activity.emoji}</span>
                <span className="font-bold text-xs sm:text-sm">{activity.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Child Quick Actions */}
      {ageGroup === 'child' && !showActivityPicker && (
        <div className="px-2 sm:px-4 py-2 flex gap-2 overflow-x-auto hide-scrollbar">
          {CHILD_ACTIVITIES.map((activity) => (
            <button
              key={activity.id}
              onClick={() => {
                setInput(`I want to try ${activity.label.toLowerCase()}!`);
                setTimeout(() => handleSend(), 100);
              }}
              disabled={isLoading}
              className="px-3 sm:px-4 py-2 glass rounded-full text-xs sm:text-sm font-semibold text-navy hover:bg-teal hover:text-white transition-all disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 touch-target"
            >
              <span>{activity.emoji}</span>
              {activity.label}
            </button>
          ))}
        </div>
      )}

      {/* Teen Quick Actions */}
      {ageGroup === 'teen' && !showActivityPicker && (
        <div className="px-2 sm:px-4 py-2 flex gap-2 overflow-x-auto hide-scrollbar">
          {TEEN_ACTIVITIES.map((activity) => (
            <button
              key={activity.id}
              onClick={() => {
                setInput(`Let's work on ${activity.label.toLowerCase()}`);
                setTimeout(() => handleSend(), 100);
              }}
              disabled={isLoading}
              className="px-3 sm:px-4 py-2 glass rounded-full text-xs sm:text-sm font-medium text-navy hover:bg-lavender hover:text-white transition-all disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 touch-target"
            >
              <span>{activity.emoji}</span>
              {activity.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="glass p-2 sm:p-4 shadow-lg border-t border-white/30 safe-area-inset-bottom">
        <div className="max-w-4xl mx-auto space-y-2 sm:space-y-3">
          {/* Main input */}
          <div className="flex gap-2 sm:gap-3">
            {/* Mic button */}
            <button
              onClick={toggleListening}
              disabled={isLoading}
              className={`p-3 sm:p-4 rounded-full transition-all transform hover:scale-110 active:scale-95 shadow-xl btn-premium touch-target ${
                isListening
                  ? 'bg-coral text-white animate-pulse-glow'
                  : 'bg-gradient-to-r from-coral to-coral-light text-white hover:from-coral-dark hover:to-coral'
              } disabled:opacity-50`}
              title={isListening ? 'Stop listening' : 'Start speaking'}
            >
              {isListening ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  ? "🎤 Listening..."
                  : ageGroup === 'toddler'
                    ? "Type or tap mic! 🎤"
                    : "Type or tap the mic..."
              }
              disabled={isLoading}
              className={`flex-1 min-w-0 px-3 sm:px-5 py-3 sm:py-4 rounded-full border-2 focus:outline-none focus-ring text-navy text-base sm:text-lg ${
                isListening
                  ? 'border-coral bg-coral/5'
                  : 'border-teal/30 bg-white/80 hover:border-teal/50'
              } disabled:bg-cream-dark placeholder:text-navy-light/60`}
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              data-send-button
              className="p-3 sm:p-4 bg-gradient-to-r from-teal to-teal-light text-white rounded-full font-bold hover:from-teal-dark hover:to-teal disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-110 active:scale-95 shadow-xl btn-premium touch-target"
            >
              {isLoading ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>

          {/* Quick responses based on age */}
          {!isListening && ageGroup === 'toddler' && (
            <div className="flex gap-1.5 sm:gap-2 justify-center flex-wrap">
              {['👍 Yes!', '👎 No', '🔄 Again!', '🎉 Yay!'].map((choice) => (
                <button
                  key={choice}
                  onClick={() => {
                    setInput(choice);
                    setTimeout(() => handleSend(), 100);
                  }}
                  disabled={isLoading}
                  className="px-3 sm:px-5 py-2 sm:py-3 bg-white rounded-full text-sm sm:text-lg font-bold text-navy hover:bg-gold hover:text-navy shadow-md transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 touch-target"
                >
                  {choice}
                </button>
              ))}
            </div>
          )}

          {!isListening && ageGroup !== 'toddler' && (
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 hide-scrollbar">
              <span className="text-xs text-navy-light self-center shrink-0">Quick:</span>
              {['A', 'B', 'C'].map((choice) => (
                <button
                  key={choice}
                  onClick={() => {
                    setInput(choice);
                    setTimeout(() => handleSend(), 100);
                  }}
                  disabled={isLoading}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/80 rounded-full text-xs sm:text-sm font-semibold text-navy hover:bg-teal hover:text-white transition-colors active:scale-95 disabled:opacity-50 touch-target"
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
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/80 rounded-full text-xs sm:text-sm font-semibold text-navy hover:bg-mint hover:text-navy transition-colors active:scale-95 disabled:opacity-50 whitespace-nowrap touch-target"
              >
                🔄 Again
              </button>
              <button
                onClick={() => {
                  setInput("Something different please");
                  setTimeout(() => handleSend(), 100);
                }}
                disabled={isLoading}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/80 rounded-full text-xs sm:text-sm font-semibold text-navy hover:bg-lavender hover:text-white transition-colors active:scale-95 disabled:opacity-50 whitespace-nowrap touch-target"
              >
                🔀 Different
              </button>
            </div>
          )}

          {/* Listening indicator */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col items-center gap-1.5 sm:gap-2"
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3 text-coral text-base sm:text-lg font-bold">
                  <div className="flex gap-0.5 sm:gap-1 items-end h-5 sm:h-6">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 sm:w-1.5 bg-coral rounded-full"
                        animate={{ height: ['10px', '20px', '10px'] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                  <span>{ageGroup === 'toddler' ? "I'm listening! 👂" : "Listening..."}</span>
                </div>
                <span className="text-xs text-navy-light text-center px-2">
                  {ageGroup === 'toddler' ? "I'll send when you stop talking! ✨" : "Auto-sends after you pause speaking"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Speaking indicator */}
          <AnimatePresence>
            {isSpeaking && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-center gap-2 sm:gap-3 text-teal text-xs sm:text-sm font-medium"
              >
                <div className="flex gap-0.5 sm:gap-1 items-center">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-teal rounded-full"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
                <span>Speaking...</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={stopSpeaking}
                  className="px-2 sm:px-3 py-1 bg-teal/10 rounded-full text-xs hover:bg-teal/20 font-semibold touch-target"
                >
                  Stop
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          {micError && (
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-coral text-xs sm:text-sm bg-coral/10 rounded-xl sm:rounded-2xl p-2 sm:p-3">
              <span>⚠️</span>
              <span className="text-center">{micError}</span>
              <button onClick={() => setMicError(null)} className="ml-1 sm:ml-2 font-bold touch-target p-1">✕</button>
            </div>
          )}

          {!micSupported && (
            <div className="text-center text-xs text-navy-light px-2">
              🎤 Voice input requires Chrome or Edge browser
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
