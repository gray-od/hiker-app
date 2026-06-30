'use client';
import { useState } from 'react';

export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [form, setForm] = useState<T>(initial);

  const update = <K extends keyof T>(field: K, value: T[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const reset = () => setForm(initial);

  return { form, update, reset, setForm };
}
