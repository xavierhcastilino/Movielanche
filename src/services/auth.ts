// Frontend-only auth. Every function is async so a real backend / provider
// (SMS gateway, Google & Apple OAuth, email service) can replace the bodies later
// without touching the UI.

export type AuthProvider = 'phone' | 'google' | 'apple';
export type OtpChannel = 'phone';

export interface AuthSession {
  provider: AuthProvider;
  phone?: string;
  phoneVerified: boolean;
  email?: string;
  emailVerified?: boolean;
  createdAt: string;
}

const SESSION_KEY = 'movielanche:session';
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface OtpRecord { code: string; expiresAt: number; attempts: number }
const pendingOtps = new Map<string, OtpRecord>();
let memorySession: AuthSession | null = null; // fallback when browser storage is blocked

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return memorySession;
    const value = JSON.parse(raw) as Partial<AuthSession>;
    if (!value || typeof value !== 'object' || !value.provider) return null;
    return { provider: value.provider, phone: value.phone, phoneVerified: value.phoneVerified === true, email: value.email, emailVerified: value.emailVerified === true, createdAt: value.createdAt ?? new Date().toISOString() };
  } catch { return memorySession; }
}

export function saveSession(session: AuthSession): void {
  memorySession = session;
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* Session stays in memory for this visit. */ }
}

export function clearSession(): void {
  memorySession = null;
  try { localStorage.removeItem(SESSION_KEY); } catch { /* Nothing to clear. */ }
  pendingOtps.clear();
}

/** Signing in only needs a verified mobile number (Google / Apple accounts also carry their own email). */
/** Signed in = mobile number verified by OTP, or a Google / Apple account. */
export const isSessionComplete = (session: AuthSession | null): session is AuthSession => Boolean(session && (session.phoneVerified || session.provider !== 'phone'));

export const isValidIndianMobile = (digits: string) => /^[6-9]\d{9}$/.test(digits);
export const formatPhone = (digits: string) => `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;

function randomCode(): string {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return String(100000 + (buffer[0] % 900000));
}

/** Creates a 6-digit code. With no SMS/email gateway wired up, the code is returned so the UI can show it as a demo hint. */
export async function sendOtp(channel: OtpChannel, target: string): Promise<{ demoCode: string; expiresInSeconds: number }> {
  const code = randomCode();
  pendingOtps.set(`${channel}:${target}`, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  await new Promise((resolve) => setTimeout(resolve, 450));
  return { demoCode: code, expiresInSeconds: OTP_TTL_MS / 1000 };
}

export async function verifyOtp(channel: OtpChannel, target: string, code: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  const key = `${channel}:${target}`;
  const record = pendingOtps.get(key);
  if (!record) throw new Error('This code has expired. Please request a new one.');
  if (Date.now() > record.expiresAt) { pendingOtps.delete(key); throw new Error('This code has expired. Please request a new one.'); }
  if (record.attempts >= MAX_ATTEMPTS) { pendingOtps.delete(key); throw new Error('Too many wrong attempts. Please request a new code.'); }
  if (record.code !== code) { record.attempts += 1; throw new Error(`That code doesn't match. ${MAX_ATTEMPTS - record.attempts} attempts left.`); }
  pendingOtps.delete(key);
}

/** Stand-in for Google / Apple OAuth. Replace the body with the real provider popup / redirect flow. */
export async function signInWithProvider(provider: Exclude<AuthProvider, 'phone'>): Promise<{ provider: AuthProvider }> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return { provider };
}
