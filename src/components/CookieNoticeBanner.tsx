import { useEffect, useState } from 'react';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { updateGoogleConsent } from '../lib/tracking';
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
  const [mounted, setMounted] = useState(false);
  const [dismissedForVersion, setDismissedForVersion] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/55 backdrop-blur-[2px] p-4 overflow-y-auto">
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-acceptance-title"
        className="my-auto w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Cookie className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h2
                id="cookie-acceptance-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5"
              >
                <span>Cookies &amp; Privacy Acceptance</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                DNS Locator uses essential local storage for 5-minute DNS caching, theme preferences, and IP-detected language selection. With your acceptance, Google Analytics and Google AdSense may use cookies in compliance with EU GDPR and Google policies. Read our{' '}
                <a
                  href="/privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    onCloseForceOpen?.();
                    onNavigatePage('privacy');
                  }}
                  className="text-sky-700 dark:text-sky-400 underline hover:text-sky-900 dark:hover:text-sky-300"
                >
                  Privacy Policy
                </a>
                .
              </p>
              {saved.choice && (
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Current choice:{' '}
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
              aria-label="Close cookies acceptance popup"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => handleAccept('essential')}
            className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={() => handleAccept('all')}
            className="h-9 px-4 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 text-white dark:text-slate-950 text-xs font-semibold shadow-xs shadow-emerald-700/20 dark:shadow-emerald-400/15 transition-all cursor-pointer"
          >
            Accept &amp; Continue
          </button>
        </div>
      </aside>
    </div>
  );
}
