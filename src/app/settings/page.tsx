'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase/client';

const locales = [
  { code: 'uk', label: 'Українська' },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [currentLocale, setCurrentLocale] = useState('uk');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [aiProvider, setAiProvider] = useState('gemini');
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [searchProvider, setSearchProvider] = useState('exa');
  const [searchKey, setSearchKey] = useState('');
  const [searchCx, setSearchCx] = useState('');
  const [aiSavedMessage, setAiSavedMessage] = useState('');
  const [searchSavedMessage, setSearchSavedMessage] = useState('');
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<'valid' | 'invalid' | null>(null);
  const [searchTesting, setSearchTesting] = useState(false);
  const [searchTestResult, setSearchTestResult] = useState<'valid' | 'invalid' | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const cookieLocale = document.cookie
      .split('; ')
      .find(c => c.startsWith('NEXT_LOCALE='))
      ?.split('=')[1];

    if (cookieLocale) {
      setCurrentLocale(cookieLocale);
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setEmail(user.email || '');
      setName(user.user_metadata?.full_name || '');

      supabase
        .from('profiles')
        .select('name, lang')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            if (data.name) setName(data.name);
            if (!cookieLocale && data.lang) {
              setCurrentLocale(data.lang);
            }
          }
          setLoading(false);
        });
    });
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const parse = (k: string) => {
      try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : null;
      } catch { return null; }
    };
    const ai = parse('prohikes.ai');
    if (ai) {
      if (ai.provider) setAiProvider(ai.provider);
      if (ai.apiKey) setAiKey(ai.apiKey);
      if (ai.model) setAiModel(ai.model);
    }
    const search = parse('prohikes.search');
    if (search) {
      if (search.provider) setSearchProvider(search.provider);
      if (search.apiKey) setSearchKey(search.apiKey);
      if (search.cx) setSearchCx(search.cx);
    }
  }, []);

  const switchLocale = async (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setCurrentLocale(locale);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ lang: locale }).eq('id', user.id);
    }
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: deleteEmailInput }),
      });
      if (!res.ok) {
        const err = await res.json();
        setDeleteError(err.error || t('delete_error'));
        setDeleting(false);
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch {
      setDeleteError(t('delete_error'));
      setDeleting(false);
    }
  };

  const handleSaveAi = async () => {
    if (!aiKey.trim()) return;
    setAiTesting(true);
    setAiTestResult(null);
    try {
      const res = await fetch('/api/byok/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'ai', config: { provider: aiProvider, apiKey: aiKey, model: aiModel } }),
      });
      const { ok } = await res.json();
      if (ok) {
        localStorage.setItem('prohikes.ai', JSON.stringify({ provider: aiProvider, apiKey: aiKey, model: aiModel }));
        setAiTestResult('valid');
        setAiSavedMessage(t('saved'));
        setTimeout(() => setAiSavedMessage(''), 2000);
      } else {
        setAiTestResult('invalid');
      }
    } catch {
      setAiTestResult('invalid');
    } finally {
      setAiTesting(false);
    }
  };

  const handleClearAi = () => {
    localStorage.removeItem('prohikes.ai');
    setAiProvider('gemini');
    setAiKey('');
    setAiModel('');
  };

  const handleSaveSearch = async () => {
    if (!searchKey.trim()) return;
    setSearchTesting(true);
    setSearchTestResult(null);
    try {
      const payload: Record<string, string> = { provider: searchProvider, apiKey: searchKey };
      if (searchProvider === 'google_cse') payload.cx = searchCx;
      const res = await fetch('/api/byok/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'search', config: payload }),
      });
      const { ok } = await res.json();
      if (ok) {
        localStorage.setItem('prohikes.search', JSON.stringify(payload));
        setSearchTestResult('valid');
        setSearchSavedMessage(t('saved'));
        setTimeout(() => setSearchSavedMessage(''), 2000);
      } else {
        setSearchTestResult('invalid');
      }
    } catch {
      setSearchTestResult('invalid');
    } finally {
      setSearchTesting(false);
    }
  };

  const handleClearSearch = () => {
    localStorage.removeItem('prohikes.search');
    setSearchProvider('exa');
    setSearchKey('');
    setSearchCx('');
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-zinc-200 dark:border-zinc-700 border-t-[#75a93a] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mb-6">
        {t('title')}
      </h1>

      <div className="space-y-6">
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            {t('language')}
          </h2>
          <div className="flex gap-2">
            {locales.map((loc) => (
              <button
                key={loc.code}
                onClick={() => switchLocale(loc.code)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentLocale === loc.code
                    ? 'bg-[#75a93a] text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {loc.label}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            {t('theme')}
          </h2>
          {mounted && (
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((th) => (
                <button
                  key={th}
                  onClick={() => setTheme(th)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    theme === th
                      ? 'bg-[#75a93a] text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {t(th)}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            {t('ai_assistant')}
          </h2>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              {t('ai_model_block')}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('provider')}</label>
                <select
                  value={aiProvider}
                  onChange={(e) => { setAiProvider(e.target.value); setAiTestResult(null); }}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                >
                  <option value="gemini">Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('api_key')}</label>
                <input
                  type="password"
                  value={aiKey}
                  onChange={(e) => { setAiKey(e.target.value); setAiTestResult(null); }}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('model_id')}</label>
                <input
                  type="text"
                  value={aiModel}
                  onChange={(e) => { setAiModel(e.target.value); setAiTestResult(null); }}
                  placeholder={aiProvider === 'gemini' ? 'gemma-4-26b-a4b-it' : aiProvider === 'openai' ? 'gpt-4o-mini' : aiProvider === 'deepseek' ? 'deepseek-chat' : 'openai/gpt-4o-mini'}
                  maxLength={200}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('byok_ai_hint')}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveAi}
                  disabled={!aiKey.trim() || aiTesting}
                  className="px-4 py-2 min-w-[44px] min-h-[44px] bg-[#75a93a] hover:bg-[#5d8a2e] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {aiTesting ? t('byok_testing') : tCommon('save')}
                </button>
                <button
                  onClick={handleClearAi}
                  className="px-4 py-2 min-w-[44px] min-h-[44px] text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  {t('clear')}
                </button>
                {aiTesting && (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 self-center">{t('byok_testing')}</span>
                )}
                {aiTestResult === 'valid' && (
                  <span className="text-sm text-[#75a93a] self-center">&#x2713; {t('byok_valid')}</span>
                )}
                {aiTestResult === 'invalid' && (
                  <span className="text-sm text-red-500 self-center">&#x2717; {t('byok_invalid')}</span>
                )}
                {aiSavedMessage && (
                  <span className="text-sm text-[#75a93a] self-center">{aiSavedMessage}</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              {t('search_block')}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('provider')}</label>
                <select
                  value={searchProvider}
                  onChange={(e) => { setSearchProvider(e.target.value); setSearchTestResult(null); }}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                >
                  <option value="exa">Exa</option>
                  <option value="brave">Brave</option>
                  <option value="tavily">Tavily</option>
                  <option value="serper">Serper</option>
                  <option value="firecrawl">Firecrawl</option>
                  <option value="perplexity">Perplexity</option>
                  <option value="google_cse">Google CSE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('api_key')}</label>
                <input
                  type="password"
                  value={searchKey}
                  onChange={(e) => { setSearchKey(e.target.value); setSearchTestResult(null); }}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                />
              </div>
              {searchProvider === 'google_cse' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('cx')}</label>
                <input
                  type="text"
                  value={searchCx}
                  onChange={(e) => { setSearchCx(e.target.value); setSearchTestResult(null); }}
                  maxLength={200}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                />
                </div>
              )}
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('byok_search_hint')}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveSearch}
                  disabled={!searchKey.trim() || searchTesting}
                  className="px-4 py-2 min-w-[44px] min-h-[44px] bg-[#75a93a] hover:bg-[#5d8a2e] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {searchTesting ? t('byok_testing') : tCommon('save')}
                </button>
                <button
                  onClick={handleClearSearch}
                  className="px-4 py-2 min-w-[44px] min-h-[44px] text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  {t('clear')}
                </button>
                {searchTesting && (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 self-center">{t('byok_testing')}</span>
                )}
                {searchTestResult === 'valid' && (
                  <span className="text-sm text-[#75a93a] self-center">&#x2713; {t('byok_valid')}</span>
                )}
                {searchTestResult === 'invalid' && (
                  <span className="text-sm text-red-500 self-center">&#x2717; {t('byok_invalid')}</span>
                )}
                {searchSavedMessage && (
                  <span className="text-sm text-[#75a93a] self-center">{searchSavedMessage}</span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            {t('profile')}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                {t('email')}
              </label>
              <p className="text-sm text-zinc-900 dark:text-zinc-100">{email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                {t('name')}
              </label>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={200}
                    className="flex-1 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#75a93a] focus:border-transparent"
                  />
                  <button
                    onClick={async () => {
                      try {
                      setSavingName(true);
                      const supabase = createClient();
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        await supabase.from('profiles').update({ name: nameInput }).eq('id', user.id);
                      }
                      setName(nameInput);
                      setEditingName(false);
                      } catch (err) {
                        console.error('Failed to save name:', err);
                      }
                      setSavingName(false);
                    }}
                    disabled={savingName}
                    className="px-3 py-2 bg-[#75a93a] hover:bg-[#5d8a2e] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {savingName ? '...' : tCommon('save')}
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    {tCommon('cancel')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">{name || '—'}</p>
                  <button
                    onClick={() => { setNameInput(name); setEditingName(true); }}
                    className="text-sm text-[#75a93a] hover:text-[#5d8a2e] font-medium"
                  >
                    {tCommon('edit')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-10 border-t border-red-200 dark:border-red-900 pt-6">
        <h2 className="text-base font-semibold text-red-600 dark:text-red-400 mb-2">
          {t('danger_zone')}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          {t('delete_account_description')}
        </p>
        <button
          onClick={() => { setDeleteModalOpen(true); setDeleteEmailInput(''); setDeleteError(''); }}
          className="px-4 py-2 min-w-[44px] min-h-[44px] bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {t('delete_account')}
        </button>
      </div>

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {t('delete_confirm_title')}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              {t('delete_confirm_text', { email })}
            </p>
            <input
              type="email"
              value={deleteEmailInput}
              onChange={(e) => setDeleteEmailInput(e.target.value)}
              placeholder={t('delete_confirm_placeholder')}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
            />
            {deleteError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="px-4 py-2 min-w-[44px] min-h-[44px] text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteEmailInput.toLowerCase() !== email.toLowerCase()}
                className="px-4 py-2 min-w-[44px] min-h-[44px] bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {deleting ? '...' : t('delete_confirm_button')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
