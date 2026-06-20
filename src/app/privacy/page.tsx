import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: t('privacy_policy') };
}

export default async function PrivacyPage() {
  const t = await getTranslations('common');

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">
          {t('privacy_policy')}
        </h1>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6 text-zinc-700 dark:text-zinc-300">
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Які дані ми збираємо</h2>
            <p>
              ProHikes збирає лише мінімально необхідні дані для роботи сервісу:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Email</strong> — для ідентифікації вашого акаунту</li>
              <li><strong>Ім&apos;я</strong> — отримується через Google при вході через Google</li>
              <li><strong>Дані спорядження</strong> — предмети, їх вага, категорії, які ви створюєте</li>
              <li><strong>Дані розкладок харчування</strong> — плани харчування, страви, продукти</li>
              <li><strong>Списки походів</strong> — списки спорядження для конкретних походів</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Мета збору даних</h2>
            <p>
              Усі дані використовуються виключно для надання вам функціоналу сервісу ProHikes —
              керування спорядженням, планування харчування, створення списків походів.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Треті сторони</h2>
            <p>Для роботи сервісу ми використовуємо наступні сторонні сервіси:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong>Supabase</strong> — зберігання даних (база даних, аутентифікація).
                Сервери знаходяться в ЄС.
              </li>
              <li>
                <strong>Google</strong> — аутентифікація при вході через Google OAuth.
              </li>
              <li>
                <strong>DeepSeek</strong> — AI-помічник. Ваші повідомлення в чаті надсилаються
                на обробку до DeepSeek API для генерації відповідей та рекомендацій.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Файли cookie</h2>
            <p>
              ProHikes використовує один файл cookie — <code>NEXT_LOCALE</code> — для збереження
              вашої мовної переваги (українська, англійська або російська). Жодних трекінгових
              або рекламних cookie не використовується.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Видалення даних</h2>
            <p>
              Ви можете запросити видалення всіх ваших даних, надіславши email на адресу{' '}
              <a href="mailto:support@prohikes.app" className="text-[#75a93a] hover:underline">
                support@prohikes.app
              </a>.
              Дані будуть видалені протягом 30 днів після отримання запиту.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Продаж даних</h2>
            <p>
              ProHikes <strong>не продає</strong> ваші персональні дані третім сторонам.
              Ми не використовуємо ваші дані для реклами чи маркетингу.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Зміни до політики</h2>
            <p>
              Ми можемо оновлювати цю політику конфіденційності час від часу.
              Про суттєві зміни ми повідомимо через сервіс.
            </p>
          </section>

          <p className="text-sm text-zinc-400 dark:text-zinc-500 pt-4">
            Останнє оновлення: червень 2026 року
          </p>
        </div>

        <div className="mt-10 text-center">
          <a
            href="/login"
            className="text-sm text-[#75a93a] hover:underline font-medium focus:ring-2 focus:ring-[#75a93a] rounded"
          >
            ← ProHikes
          </a>
        </div>
      </div>
    </div>
  );
}
