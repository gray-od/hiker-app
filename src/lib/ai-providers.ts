import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

const AI_PROVIDERS = ['gemini', 'openai', 'deepseek', 'openrouter'] as const;
type AiProvider = (typeof AI_PROVIDERS)[number];

interface UserAiConfig {
  provider: string;
  apiKey: string;
  model?: string;
}

function isValidAiConfig(input: unknown): input is UserAiConfig {
  if (!input || typeof input !== 'object') return false;
  const c = input as Record<string, unknown>;
  if (typeof c.provider !== 'string' || !AI_PROVIDERS.includes(c.provider as AiProvider)) return false;
  if (typeof c.apiKey !== 'string' || c.apiKey.trim().length === 0) return false;
  if (c.model !== undefined && typeof c.model !== 'string') return false;
  return true;
}

const MODEL_FALLBACKS: Record<AiProvider, string> = {
  gemini: 'gemma-4-26b-a4b-it',
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
  openrouter: 'openai/gpt-4o-mini',
};

export function resolveUserModel(ai: unknown): LanguageModel | null {
  if (!isValidAiConfig(ai)) return null;

  const provider = ai.provider as AiProvider;
  const modelId = ai.model || MODEL_FALLBACKS[provider];

  switch (provider) {
    case 'gemini':
      return createGoogleGenerativeAI({ apiKey: ai.apiKey })(modelId);
    case 'openai':
      return createOpenAI({ apiKey: ai.apiKey, baseURL: 'https://api.openai.com/v1' })(modelId);
    case 'deepseek':
      return createOpenAI({ apiKey: ai.apiKey, baseURL: 'https://api.deepseek.com/v1' })(modelId);
    case 'openrouter':
      return createOpenAI({ apiKey: ai.apiKey, baseURL: 'https://openrouter.ai/api/v1' })(modelId);
  }
}
