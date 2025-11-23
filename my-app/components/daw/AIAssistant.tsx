'use client';

import { DAWAssistantRequest, DAWAssistantResponse } from '@/types/music-production';
import { Lightbulb, Send, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

interface AIAssistantProps {
  dawState: DAWAssistantRequest['dawState'];
  onActionsReceived: (response: DAWAssistantResponse) => void;
}

export default function AIAssistant({ dawState, onActionsReceived }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your DAW assistant. I can help you create tracks, adjust volumes, set BPM, and provide creative suggestions. What would you like to do?",
      suggestions: [
        'Create a new MIDI drum track',
        'Add a bass track',
        'What should I add next?',
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsProcessing(true);

    try {
      const requestBody: DAWAssistantRequest = {
        message: userMessage,
        dawState,
      };

      const response = await fetch('/api/daw-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from assistant');
      }

      const data: DAWAssistantResponse = await response.json();

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          suggestions: data.suggestions,
        },
      ]);

      // Notify parent component to execute actions
      if (data.actions.length > 0) {
        onActionsReceived(data);
      }
    } catch (error) {
      console.error('Error communicating with assistant:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-100">AI Assistant</h3>
        </div>
        <p className="text-xs text-slate-400">
          Ask me to create tracks, adjust settings, or get creative ideas
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx}>
            <div
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {msg.content}
              </div>
            </div>

            {/* Suggestions */}
            {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
              <div className="mt-2 ml-1 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                  <Lightbulb className="w-3 h-3" />
                  <span>Suggestions:</span>
                </div>
                {msg.suggestions.map((suggestion, sidx) => (
                  <button
                    key={sidx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="block w-full text-left text-xs px-2.5 py-1.5 rounded bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-colors"
                    disabled={isProcessing}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 rounded-lg px-3 py-2 text-sm">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>
                  •
                </span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>
                  •
                </span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>
                  •
                </span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-100 placeholder-slate-500"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-2">
          Try: "Create a drum track" or "Adjust BPM to 128"
        </p>
      </div>
    </div>
  );
}

