import { clearSession, getSession, isSessionComplete } from '../services/auth';

export const DEMO_AUTH_KEY = 'movielanche:demo-auth';
export const ONBOARDING_COMPLETE_KEY = 'movielanche:onboarding-complete';

/** True once the mobile number has been verified with an OTP. */
export function isDemoAuthenticated(): boolean {
  return isSessionComplete(getSession());
}

export function saveDemoAuth(email = ''): boolean {
  try {
    localStorage.setItem(DEMO_AUTH_KEY, 'true');
    if (email.trim()) localStorage.setItem('movielanche:demo-email', email.trim().slice(0, 80));
    return true;
  } catch { return false; }
}

export function completeOnboarding(): boolean {
  try {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    return true;
  } catch { return false; }
}

export function hasCompletedOnboarding(): boolean {
  try { return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true'; } catch { return false; }
}

export function logoutDemoSession(): void {
  try {
    localStorage.removeItem(DEMO_AUTH_KEY);
    localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    localStorage.removeItem('movielanche:demo-email');
    clearSession();
  } catch {
    // The next navigation still returns the user to the auth screen.
  }
}
