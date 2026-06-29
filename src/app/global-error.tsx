'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="uk">
      <body className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-red-500 mb-4">!</h1>
          <p className="text-lg text-zinc-600 mb-8">Щось пішло не так / Something went wrong</p>
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-3 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white font-medium rounded-lg transition-colors"
          >
            Спробувати ще / Try again
          </button>
        </div>
      </body>
    </html>
  );
}
