'use client';

interface LoadingSpinnerProps {
  fullPage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-6 h-6 border-[3px]',
  md: 'w-8 h-8 border-4',
  lg: 'w-12 h-12 border-4',
} as const;

export default function LoadingSpinner({ fullPage = false, size = 'md' }: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={`${sizeMap[size]} border-zinc-200 dark:border-zinc-700 border-t-[#75a93a] rounded-full animate-spin`}
    />
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-zinc-900">
        {spinner}
      </div>
    );
  }

  return spinner;
}
