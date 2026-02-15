export type ConnectedProvider = 'instagram' | 'facebook' | 'local' | 'none';

export type UserProfile = {
  displayName?: string;
  avatarUrl?: string;
  provider?: ConnectedProvider;
  consentShowInOsint?: boolean;
  consentSaveHistory?: boolean;
};

const STORAGE_KEY = 'fud_user_profile_v1';

export function loadUserProfile(): UserProfile | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as UserProfile;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearUserProfile(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function requestOsintExpandOnce(): void {
  window.localStorage.setItem('fud_osint_expand_once', '1');
}

export function consumeOsintExpandOnce(): boolean {
  const v = window.localStorage.getItem('fud_osint_expand_once');
  if (v === '1') {
    window.localStorage.removeItem('fud_osint_expand_once');
    return true;
  }
  return false;
}
