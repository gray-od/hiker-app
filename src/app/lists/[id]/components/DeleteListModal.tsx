'use client';

import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

interface DeleteListModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export default function DeleteListModal({
  open,
  onCancel,
  onConfirm,
  title,
  message,
}: DeleteListModalProps) {
  return (
    <ConfirmDeleteModal
      open={open}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={title}
      message={message}
    />
  );
}
