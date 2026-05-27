export function setCookie(name: string, value: string, days = 365): void {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  const target = encodeURIComponent(name);
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const p of parts) {
    const [k, v = ''] = p.split('=');
    if (k === target) return decodeURIComponent(v);
  }
  return null;
}
