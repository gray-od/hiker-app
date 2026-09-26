/**
 * Путь возврата после входа: пропускаем только путь на этом же сайте, иначе null.
 * Начинаться он обязан с одного "/"; "//host" — protocol-relative адрес, а "\" браузеры
 * в URL нормализуют в "/", поэтому "/\host" уводит на чужой origin так же. Абсолютный
 * URL со схемой под правило "начинается с /" не подходит по определению.
 * Запасное значение (обычно "/") выбирает вызывающая сторона.
 */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

function isLocalPath(value: string): boolean {
  if (!value.startsWith('/')) return false;
  // Нормализация URL вырезает управляющие символы (C0, коды < 0x20, и DEL 0x7F),
  // поэтому "/\t/evil.com" после вычистки таба вырождается в "//evil.com" —
  // protocol-relative адрес на чужой хост. Такое значение отбрасываем целиком.
  if (CONTROL_CHARS.test(value)) return false;
  if (value.startsWith('//')) return false;
  if (value.startsWith('/\\')) return false;
  return true;
}

export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!isLocalPath(value)) return null;
  // То же правило проверяется над расшифрованным видом: "/%09/evil.com" в сыром виде
  // его проходит (ведущий "/" есть, "//" и "/\" отсутствуют, управляющих символов в
  // тексте нет), но звено, которое декодирует значение перед переходом (клиентский
  // роутер, location.assign), получает "/\t/evil.com" — разбор URL вырезает таб и
  // оставляет "//evil.com", protocol-relative адрес на чужой хост. Тот же обход дают
  // "/%2F%2Fevil.com" ("//") и "/%5Cevil.com" ("/\"). Некорректная "%"-последовательность
  // тоже отклоняется: расшифрованный вид у неё не проверить.
  try {
    if (!isLocalPath(decodeURIComponent(value))) return null;
  } catch {
    return null;
  }
  return value;
}
