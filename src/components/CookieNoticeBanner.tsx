import { useState } from 'react';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { updateGoogleConsent } from '../lib/analytics';
import type { LegalPageRoute } from './LegalPages';

export const COOKIE_CONSENT_STORAGE_KEY = 'dnslocator_cookie_consent_v1';

export type CookieConsentChoice = 'all' | 'essential' | null;

export function getSavedCookieConsent(): {
  choice: CookieConsentChoice;
  updatedAt?: string;
} {
  if (typeof window === 'undefined') return { choice: null };
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return { choice: null };
    const parsed = JSON.parse(raw) as { choice?: string; updatedAt?: string };
    if (parsed.choice === 'all' || parsed.choice === 'essential') {
      return { choice: parsed.choice, updatedAt: parsed.updatedAt };
    }
  } catch {
    // Ignore storage read errors
  }
  return { choice: null };
}

export function saveCookieConsent(choice: Exclude<CookieConsentChoice, null>): string {
  const updatedAt = new Date().toISOString();
  try {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({ choice, updatedAt })
    );
  } catch {
    // Ignore storage write errors
  }
  updateGoogleConsent(choice);
  return updatedAt;
}

export function clearCookieConsent() {
  try {
    window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

interface CookieNoticeBannerProps {
  onNavigatePage: (page: LegalPageRoute) => void;
  consentVersion: number;
  forceOpen?: boolean;
  onCloseForceOpen?: () => void;
  onConsentSaved: () => void;
}

export default function CookieNoticeBanner({
  onNavigatePage,
  consentVersion,
  forceOpen = false,
  onCloseForceOpen,
  onConsentSaved,
}: CookieNoticeBannerProps) {
  const [dismissedForVersion, setDismissedForVersion] = useState<number | null>(null);
  const saved = getSavedCookieConsent();

  const shouldShow =
    forceOpen || (saved.choice === null && dismissedForVersion !== consentVersion);

  if (!shouldShow) {
    return null;
  }

  const handleAccept = (choice: 'all' | 'essential') => {
    saveCookieConsent(choice);
    setDismissedForVersion(consentVersion);
    onConsentSaved();
    onCloseForceOpen?.();
  };

  return (
    <div
      className={
        forceOpen
          ? 'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4'
          : ''
      }
    >
      <aside
        role={forceOpen ? 'dialog' : 'region'}
        aria-modal={forceOpen ? 'true' : undefined}
        aria-label="EU GDPR Cookies Notice Popup"
        className={
          forceOpen
            ? 'w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-5 sm:p-6 space-y-4'
            : 'fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-lg z-40 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl p-4 sm:p-5 space-y-3'
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Cookie className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Cookies &amp; GDPR Notice</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                DNS Locator uses essential local storage for 5-minute DNS caching, theme preferences, and IP-detected language selection. With your consent, Google Analytics and Google AdSense may use cookies in compliance with EU GDPR and Google policies. Read our{' '}
                <button
                  type="button"
                  onClick={() => {
                    onCloseForceOpen?.();
                    onNavigatePage('privacy');
                  }}
                  className="text-sky-700 dark:text-sky-400 underline hover:text-sky-900 dark:hover:text-sky-300 cursor-pointer"
                >
                  Privacy Policy
                </button>
                .
              </p>
              {saved.choice && (
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-0.5">
                  Current selection:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {saved.choice === 'all' ? 'Accepted All Cookies' : 'Essential Only'}
                  </strong>
                </p>
              )}
            </div>
          </div>

          {forceOpen && (
            <button
              type="button"
              onClick={() => onCloseForceOpen?.()}
              aria-label="Close cookies notice"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleAccept('essential')}
            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={() => handleAccept('all')}
            className="h-8 px-3.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
          >
            Accept &amp; Continue
          </button>
        </div>
      </aside>
    </div>
  );
}
