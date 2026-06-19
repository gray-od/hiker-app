'use client';

import { useChat } from 'ai/react';
import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';

export default function ChatWidget() {
  const t = useTranslations('chat');
  const [open, setOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-12 h-12 bg-[#75a93a] hover:bg-[#5d8a2e] text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
          title={t('title')}
        >
          <Sparkles className="w-5 h-5" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-[400px] md:h-[600px] md:max-h-[80vh] z-50 flex flex-col bg-white dark:bg-zinc-900 md:rounded-2xl md:shadow-2xl md:border md:border-zinc-200 md:dark:border-zinc-800">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#75a93a]" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t('title')}</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="w-10 h-10 mx-auto text-[#75a93a]/40 mb-3" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[250px] mx-auto">
                  {t('welcome')}
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#75a93a] text-white rounded-br-md'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 rounded-2xl rounded-bl-md">
                  <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0 safe-area-bottom"
          >
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder={t('placeholder')}
                className="flex-1 px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#75a93a]"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#75a93a] hover:bg-[#5d8a2e] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
