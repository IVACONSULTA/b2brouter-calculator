import type { AstroCookies } from 'astro';

export interface Session {
  role: 'admin' | 'internal' | 'client' | 'customer';
  email: string;
  name: string;
  loggedInAt: string;
}

export function getSession(cookies: AstroCookies): Session | null {
  const raw = cookies.get('session')?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}
