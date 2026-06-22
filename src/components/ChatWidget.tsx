'use client';

import { useChat } from 'ai/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, X, Send, Loader2, Maximize2, Minimize2, Copy, Check, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function stripThoughts(text: string): string {
  return text
    // remove leaked reasoning blocks
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/<thought>[\s\S]*$/i, '')
    .replace(/<\/?thought>/gi, '')
    // unwrap inline LaTeX math that wraps a backslash command: $\rightarrow$ -> \rightarrow
    .replace(/\$([^$\n]*\\[^$\n]*)\$/g, '$1')
    // convert common LaTeX commands to Unicode (model sometimes ignores the no-LaTeX rule)
    .replace(/\\(?:longrightarrow|rightarrow|Rightarrow|to)\b/g, '→')
    .replace(/\\(?:longleftarrow|leftarrow|Leftarrow)\b/g, '←')
    .replace(/\\leftrightarrow\b/g, '↔')
    .replace(/\\times\b/g, '×')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\pm\b/g, '±')
    .replace(/\\(?:leq|le)\b/g, '≤')
    .replace(/\\(?:geq|ge)\b/g, '≥')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\(?:degree|circ)\b/g, '°')
    .replace(/\\bullet\b/g, '•')
    .replace(/^\s+/, '');
}

export default function ChatWidget() {
  const t = useTranslations('chat');
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);

  const { messages, input, handleInputChange, handleSubmit, append, setInput, isLoading, error } = useChat({
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

  const readByok = () => {
    if (typeof window === 'undefined') return { ai: null, search: null };
    const parse = (k: string) => {
      try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : null;
      } catch { return null; }
    };
    return { ai: parse('prohikes.ai'), search: parse('prohikes.search') };
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachedFile) return;
    if (isLoading) return;

    if (attachedFile) {
      const fullContent = `[Файл: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\`\n\n${input}`;
      append({ role: 'user', content: fullContent }, { body: readByok() });
      setInput('');
      setAttachedFile(null);
    } else {
      handleSubmit(e, { body: readByok() });
    }
    resetTextareaHeight();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((!input.trim() && !attachedFile) || isLoading) return;

      if (attachedFile) {
        const fullContent = `[Файл: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\`\n\n${input}`;
        append({ role: 'user', content: fullContent }, { body: readByok() });
        setInput('');
        setAttachedFile(null);
      } else {
        handleSubmit(e, { body: readByok() });
      }
      resetTextareaHeight();
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
                aria-label={expanded ? t('collapse') : t('expand')}
                className="hidden md:flex min-w-[44px] min-h-[44px] items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label={t('close')}
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
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">{t('attach_hint')}</p>
              </div>
            )}

            {messages.map((msg) => {
              const isCopied = copiedId === msg.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-[85%] min-w-0 px-3 py-2 rounded-2xl text-sm leading-relaxed break-words overflow-hidden bg-[#75a93a] text-white rounded-br-md whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="group max-w-[85%] min-w-0">
                      <div className="px-3 py-2 rounded-2xl text-sm leading-relaxed break-words overflow-hidden bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li>{children}</li>,
                            h1: ({ children }) => <p className="font-bold text-base mb-1">{children}</p>,
                            h2: ({ children }) => <p className="font-bold mb-1">{children}</p>,
                            h3: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#75a93a] underline hover:text-[#5d8a2e] break-all">{children}</a>,
                            code: ({ children }) => <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded text-xs break-all">{children}</code>,
                            pre: ({ children }) => <pre className="overflow-x-auto mb-2 text-xs">{children}</pre>,
                            table: ({ children }) => <div className="overflow-x-auto mb-2"><table className="text-xs border-collapse">{children}</table></div>,
                            th: ({ children }) => <th className="border border-zinc-300 dark:border-zinc-600 px-1.5 py-0.5 text-left font-semibold">{children}</th>,
                            td: ({ children }) => <td className="border border-zinc-300 dark:border-zinc-600 px-1.5 py-0.5">{children}</td>,
                          }}
                        >
                          {stripThoughts(msg.content)}
                        </ReactMarkdown>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(stripThoughts(msg.content));
                          setCopiedId(msg.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        aria-label={isCopied ? t('copied') : t('copy')}
                        className="mt-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 p-1 rounded"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && messages.length > 0 && (messages[messages.length - 1]?.role === 'user' || !messages[messages.length - 1]?.content) && (
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
              ) : error.message?.includes('MODEL_NO_TOOLS') ? (
                <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm">
                  <p className="text-amber-700 dark:text-amber-400 font-medium">{t('model_no_tools')}</p>
                </div>
              ) : error.message?.includes('BYOK_FAILED') ? (
                <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm">
                  <p className="text-amber-700 dark:text-amber-400 font-medium">{t('byok_key_failed')}</p>
                </div>
              ) : (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
                  {error.message}
                </div>
              )
            )}

          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,.txt,.tsv,text/csv,text/plain,text/tab-separated-values"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 102400) {
                alert(t('file_too_large'));
                e.target.value = '';
                return;
              }
              if (!/\.(csv|txt|tsv)$/i.test(file.name)) {
                alert(t('file_invalid_type'));
                e.target.value = '';
                return;
              }
              const reader = new FileReader();
              reader.onload = (ev) => {
                setAttachedFile({ name: file.name, content: ev.target?.result as string });
              };
              reader.onerror = () => {
                alert(t('file_read_error'));
              };
              reader.readAsText(file);
              e.target.value = '';
            }}
          />

          <form
            onSubmit={onSubmit}
            className="px-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
          >
            {attachedFile && (
              <div className="mb-2 flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-xs px-2 py-1 rounded-lg">
                <span className="truncate max-w-[200px]">{attachedFile.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 shrink-0"
                  aria-label={t('close')}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label={t('attach_file')}
                title={t('attach_hint')}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
              >
                <Paperclip className="w-4 h-4" />
              </button>
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
                disabled={isLoading || (!input.trim() && !attachedFile)}
                aria-label={t('send')}
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
