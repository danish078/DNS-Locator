import type { CookieConsentChoice } from '../components/CookieNoticeBanner';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __dnsLocatorGaInitialized?: boolean;
    __dnsLocatorAdsenseLoaded?: boolean;
  }
}

const PLACEHOLDER_PATTERNS = /^(MY_|YOUR_|G-X+|ca-pub-X+|placeholder|example)/i;

function readPopulatedEnv(rawValue: string | undefined): string | null {
  const trimmed = rawValue?.trim() ?? '';
  if (!trimmed || PLACEHOLDER_PATTERNS.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function getGaMeasurementId(): string | null {
  const val = readPopulatedEnv(import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined);
  if (!val || !/^G-[A-Z0-9]{4,}$/i.test(val)) {
    return null;
  }
  return val;
}

export function getGoogleSiteVerificationToken(): string | null {
  const val = readPopulatedEnv(
    import.meta.env.VITE_GOOGLE_SITE_VERIFICATION as string | undefined
  );
  if (!val || val.length < 8) {
    return null;
  }
  return val;
}

export function getAdSenseClientId(): string | null {
  const val = readPopulatedEnv(import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined);
  if (!val || !/^ca-pub-\d{8,}$/i.test(val)) {
    return null;
  }
  return val;
}

export function isAdSenseEnabled(): boolean {
  return getAdSenseClientId() !== null;
}

function ensureGtagQueue() {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }
}

export function initGoogleSearchConsole(): boolean {
  if (typeof document === 'undefined') return false;
  const token = getGoogleSiteVerificationToken();
  if (!token) return false;

  let meta = document.querySelector('meta[name="google-site-verification"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'google-site-verification');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', token);
  return true;
}

export function initGoogleAnalytics(initialConsent: CookieConsentChoice): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const measurementId = getGaMeasurementId();
  if (!measurementId) return false;

  ensureGtagQueue();

  if (!window.__dnsLocatorGaInitialized) {
    window.__dnsLocatorGaInitialized = true;
    const granted = initialConsent === 'all' ? 'granted' : 'denied';
    window.gtag?.('consent', 'default', {
      analytics_storage: granted,
      ad_storage: granted,
      ad_user_data: granted,
      ad_personalization: granted,
    });
    window.gtag?.('js', new Date());
    window.gtag?.('config', measurementId, {
      anonymize_ip: true,
      send_page_view: false,
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }
  return true;
}

export function initGoogleAdSense(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const clientId = getAdSenseClientId();
  if (!clientId) return false;

  if (!window.__dnsLocatorAdsenseLoaded) {
    window.__dnsLocatorAdsenseLoaded = true;
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
      clientId
    )}`;
    document.head.appendChild(script);
  }
  return true;
}

/**
 * Initializes Google Search Console verification, Google Analytics 4 (Consent Mode v2),
 * and AdSense only when valid environment variables are populated.
 */
export function initializeTracking(initialConsent: CookieConsentChoice) {
  const searchConsoleEnabled = initGoogleSearchConsole();
  const gaEnabled = initGoogleAnalytics(initialConsent);
  const adsenseEnabled = initGoogleAdSense();

  return {
    searchConsoleEnabled,
    gaEnabled,
    adsenseEnabled,
  };
}

export function updateGoogleConsent(choice: Exclude<CookieConsentChoice, null>) {
  if (typeof window === 'undefined' || !getGaMeasurementId()) return;
  const granted = choice === 'all' ? 'granted' : 'denied';
  ensureGtagQueue();
  window.gtag?.('consent', 'update', {
    analytics_storage: granted,
    ad_storage: granted,
    ad_user_data: granted,
    ad_personalization: granted,
  });
}

export function trackAnalyticsPageView(path: string, title: string) {
  if (typeof window === 'undefined') return;
  if (!getGaMeasurementId() || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  });
}

export function trackDnsLookupEvent(recordType: string) {
  if (typeof window === 'undefined') return;
  if (!getGaMeasurementId() || !window.gtag) return;
  window.gtag('event', 'dns_lookup', {
    record_type: recordType,
  });
}
