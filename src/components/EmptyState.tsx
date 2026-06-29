'use client';

interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
      {icon ?? (
        <svg
          className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4"
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="6" y="10" width="36" height="28" rx="3" />
          <line x1="6" y1="20" x2="42" y2="20" />
          <line x1="18" y1="10" x2="18" y2="38" />
          <line x1="30" y1="10" x2="30" y2="38" />
        </svg>
      )}
      <h3 className="text-base font-medium text-zinc-700 dark:text-zinc-300">{message}</h3>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
