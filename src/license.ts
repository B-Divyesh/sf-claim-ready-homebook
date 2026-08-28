import type { LicenseState } from './types';

const SLUG = 'claim-ready-homebook';
const TOKEN_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `sb_license_verdict:${SLUG}`;
const DAY = 86_400_000;
const API_BASE = import.meta.env.VITE_BILLING_BASE || 'https://api.sociobot.in';

interface Verdict { valid: boolean; checkedAt: number }

export const checkoutUrl = `${API_BASE}/api/v1/products/${SLUG}/checkout`;

export function captureLicense(): string | null {
  const url = new URL(location.href);
  const incoming = url.searchParams.get('license');
  if (incoming) {
    localStorage.setItem(TOKEN_KEY, incoming.trim());
    url.searchParams.delete('license');
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }
  return incoming?.trim() || localStorage.getItem(TOKEN_KEY);
}

function cachedVerdict(): Verdict | null {
  try { return JSON.parse(localStorage.getItem(VERDICT_KEY) || 'null') as Verdict | null; }
  catch { return null; }
}

export function initialLicenseState(token: string | null): LicenseState {
  const verdict = cachedVerdict();
  return { token, valid: Boolean(token && verdict?.valid), checking: false, notice: '' };
}

export async function verifyLicense(state: LicenseState, force = false): Promise<LicenseState> {
  if (!state.token) return { ...state, valid: false, checking: false };
  const cached = cachedVerdict();
  if (!force && cached && Date.now() - cached.checkedAt < DAY) return { ...state, valid: cached.valid, checking: false };
  try {
    const response = await fetch(`${API_BASE}/api/v1/products/${SLUG}/verify?license=${encodeURIComponent(state.token)}`);
    if (!response.ok) throw new Error('Verification service unavailable');
    const result = await response.json() as { valid: boolean; reason?: string };
    localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: result.valid, checkedAt: Date.now() }));
    return {
      ...state, valid: result.valid, checking: false,
      notice: result.valid ? 'Claim Pack is unlocked on this device.' : 'This license is no longer active. Your records and free exports are unchanged.'
    };
  } catch {
    return { ...state, checking: false, notice: state.valid ? 'Offline: using your last verified license.' : 'Could not verify this license. Check your connection and try again.' };
  }
}

export function storeLicense(token: string): LicenseState {
  const clean = token.trim();
  localStorage.setItem(TOKEN_KEY, clean);
  localStorage.removeItem(VERDICT_KEY);
  return { token: clean, valid: false, checking: true, notice: 'Checking license…' };
}
