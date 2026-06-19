'use client';

import { useChat } from 'ai/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, X, Send, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ChatWidget() {
  const t = useTranslations('chat');
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
  });

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, []);

  const resetTextareaHeight = useCallback(() => {
    setTimeout(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }, 0);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    handleSubmit(e);
    resetTextareaHeight();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e);
        resetTextareaHeight();
      }
    }
  };

  return (
    <div className="print:!hidden">
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
        <div className={`fixed inset-0 md:inset-auto md:bottom-6 md:right-6 ${expanded ? 'md:w-[700px]' : 'md:w-[480px]'} md:h-[600px] md:max-h-[80vh] z-50 flex flex-col bg-white dark:bg-zinc-900 md:rounded-2xl md:shadow-2xl md:border md:border-zinc-200 md:dark:border-zinc-800 transition-[width] duration-200`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#75a93a]" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t('title')}</h3>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setExpanded(!expanded)}
                className="hidden md:flex min-w-[44px] min-h-[44px] items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4">
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
                  className={`max-w-[85%] min-w-0 px-3 py-2 rounded-2xl text-sm leading-relaxed break-words overflow-hidden ${
                    msg.role === 'user'
                      ? 'bg-[#75a93a] text-white rounded-br-md whitespace-pre-wrap'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md'
                  }`}
                >
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        h1: ({ children }) => <p className="font-bold text-base mb-1">{children}</p>,
                        h2: ({ children }) => <p className="font-bold mb-1">{children}</p>,
                        h3: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                        code: ({ children }) => <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded text-xs break-all">{children}</code>,
                        pre: ({ children }) => <pre className="overflow-x-auto mb-2 text-xs">{children}</pre>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
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

            {error && (
              error.message?.includes('RATE_LIMIT') ? (
                <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm">
                  <p className="text-amber-700 dark:text-amber-400 font-medium mb-2">{t('limit_reached')}</p>
                  {process.env.NEXT_PUBLIC_DONATE_URL && (
                    <a
                      href={process.env.NEXT_PUBLIC_DONATE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#75a93a] hover:bg-[#5d8a2e] text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {t('donate')}
                    </a>
                  )}
                </div>
              ) : (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
                  {error.message}
                </div>
              )
            )}

          </div>

          <form
            onSubmit={onSubmit}
            className="px-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => { handleInputChange(e); adjustTextareaHeight(); }}
                onKeyDown={onKeyDown}
                placeholder={t('placeholder')}
                rows={1}
                className="flex-1 px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#75a93a] resize-none leading-normal"
                disabled={isLoading}
                style={{ maxHeight: '120px' }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#75a93a] hover:bg-[#5d8a2e] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-xl transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
