'use client';

import Modal from '@/components/Modal';

interface ConfirmDeleteModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  loading?: boolean;
}

export default function ConfirmDeleteModal({
  open,
  onCancel,
  onConfirm,
  title = 'Delete?',
  message = 'This action cannot be undone.',
  loading = false,
}: ConfirmDeleteModalProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth="max-w-sm" showCloseButton={false}>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      <div className="flex gap-3 justify-end mt-4">
        <button
          onClick={onCancel}
          disabled={loading}
          className="min-h-[44px] px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
        >
          {loading && (
            <svg
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          Delete
        </button>
      </div>
    </Modal>
  );
}
