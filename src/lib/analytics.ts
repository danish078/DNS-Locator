import type { CookieConsentChoice } from '../components/CookieNoticeBanner';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __dnsLocatorGaInitialized?: boolean;
    __dnsLocatorAdsenseLoaded?: boolean;
  }
}

// DNS Locator's GA4 web stream (https://www.dnslocator.online). Public by design;
// VITE_GA_MEASUREMENT_ID overrides it when set at build time.
const DEFAULT_GA_MEASUREMENT_ID = 'G-6T5GYF39F1';

function getMeasurementId(): string | null {
  const id =
    (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() ||
    DEFAULT_GA_MEASUREMENT_ID;
  if (!id || !/^G-[A-Z0-9]+$/i.test(id)) return null;
  return id;
}

function getSiteVerificationToken(): string | null {
  const token = (import.meta.env.VITE_GOOGLE_SITE_VERIFICATION as string | undefined)?.trim();
  return token || null;
}

function getAdSenseClientId(): string | null {
  const client = (import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined)?.trim();
  if (!client || !/^ca-pub-\d+$/i.test(client)) return null;
  return client;
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

export function injectSearchConsoleVerificationTag() {
  if (typeof document === 'undefined') return;
  const token = getSiteVerificationToken();
  if (!token) return;

  let meta = document.querySelector('meta[name="google-site-verification"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'google-site-verification');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', token);
}

export function initGoogleAnalytics(initialConsent: CookieConsentChoice) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const measurementId = getMeasurementId();
  if (!measurementId) return;

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
}

export function updateGoogleConsent(choice: Exclude<CookieConsentChoice, null>) {
  if (typeof window === 'undefined') return;
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
  const measurementId = getMeasurementId();
  if (!measurementId || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  });
}

export function trackDnsLookupEvent(recordType: string) {
  if (typeof window === 'undefined') return;
  const measurementId = getMeasurementId();
  if (!measurementId || !window.gtag) return;
  window.gtag('event', 'dns_lookup', {
    record_type: recordType,
  });
}

export function initAdSenseIfConfigured() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const clientId = getAdSenseClientId();
  if (!clientId || window.__dnsLocatorAdsenseLoaded) return;
  window.__dnsLocatorAdsenseLoaded = true;
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
    clientId
  )}`;
  document.head.appendChild(script);
}
