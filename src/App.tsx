import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  ArrowUp,
  Check,
  Clock,
  Copy,
  Globe,
  Moon,
  RefreshCw,
  Search,
  Server,
  Share2,
  ShieldCheck,
  Sun,
  Trash2,
  Zap,
} from 'lucide-react';
import AllRecordsResults from './components/AllRecordsResults';
import CookieNoticeBanner from './components/CookieNoticeBanner';
import DnsEducationGuide from './components/DnsEducationGuide';
import LegalPages, { type LegalPageRoute } from './components/LegalPages';
import OfflineIndicator from './components/OfflineIndicator';
import PropagationResults from './components/PropagationResults';
import PWAInstallButton from './components/PWAInstallButton';
import { NotFoundTemplate } from './components/StatusTemplates';
import { usePWAInstall } from './hooks/usePWAInstall';
import {
  addRecentLookup,
  clearAllDnsCache,
  getCachedResult,
  getRecentLookups,
  setCachedResult,
  type RecentLookupEntry,
} from './lib/cache';
import { formatTtl, sanitizeDomainInput } from './lib/domain';
import { useI18n } from './lib/i18n';
import {
  ALL_ZONE_RECORD_TYPES,
  PROPAGATION_RECORD_TYPES,
  type DnsLookupResponse,
  type DnsRecordType,
  type PropagationResponse,
} from './types/dns';

type AppRoute = 'home' | LegalPageRoute | 'not-found';
type WorkspaceView = 'overview' | 'all' | 'regions';
type ThemeMode = 'light' | 'dark';

function getRouteFromPath(pathname: string): AppRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '/index.html') return 'home';
  if (clean === '/about') return 'about';
  if (clean === '/contact') return 'contact';
  if (clean === '/privacy') return 'privacy';
  if (clean === '/terms') return 'terms';
  if (clean === '/disclaimer') return 'disclaimer';
  if (clean === '/cookies-policy') return 'cookies-policy';
  if (clean === '/cookies-notice') return 'cookies-notice';
  return 'not-found';
}

function getInitialTheme(): ThemeMode {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  return 'light';
}

export default function App() {
  const { isInstalled } = usePWAInstall();
  const { lang, switchToEnglish, t } = useI18n();

  const [route, setRoute] = useState<AppRoute>(() =>
    getRouteFromPath(window.location.pathname)
  );
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [view, setView] = useState<WorkspaceView>('overview');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [consentVersion, setConsentVersion] = useState(0);
  const [rawInput, setRawInput] = useState('');
  const [recordType, setRecordType] = useState<DnsRecordType>('A');
  const [expectedValue, setExpectedValue] = useState('');

  const [propagationData, setPropagationData] = useState<PropagationResponse | null>(null);
  const [allRecordsData, setAllRecordsData] = useState<DnsLookupResponse | null>(null);
  const [isPropLoading, setIsPropLoading] = useState(false);
  const [isAllLoading, setIsAllLoading] = useState(false);
  const [propError, setPropError] = useState<string | null>(null);
  const [allError, setAllError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const [cacheBanner, setCacheBanner] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [snapshotCopiedKey, setSnapshotCopiedKey] = useState<string | null>(null);
  const [recentLookups, setRecentLookups] = useState<RecentLookupEntry[]>(() =>
    getRecentLookups()
  );

  const debounceTimerRef = useRef<number | null>(null);
  const domainInputRef = useRef<HTMLInputElement | null>(null);

  const isLoading = isPropLoading || isAllLoading;

  const sanitizedPreview = useMemo(
    () => sanitizeDomainInput(rawInput, recordType),
    [rawInput, recordType]
  );

  // Track scroll depth to reveal the Move to Top button
  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 320);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Sync theme class, localStorage, and theme-color meta tag
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem('dnslocator_theme', theme);
    } catch {
      // Ignore storage failures
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#0F172A' : '#F8FAFC');
    }
  }, [theme]);

  // Global "/" shortcut to focus the domain input cleanly
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (route !== 'home') return;
      e.preventDefault();
      domainInputRef.current?.focus();
      domainInputRef.current?.select();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [route]);

  // Sync browser back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname);
      setRoute(getRouteFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // SEO Protection: apply noindex on dynamic ?domain= query URLs or 404 routes & sync canonical + OG URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasQueryDomain = params.has('domain') || params.has('q');

    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (hasQueryDomain || route === 'not-found') {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', 'noindex, follow');
    } else if (robotsMeta) {
      robotsMeta.remove();
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    const cleanPath = route === 'home' || route === 'not-found' ? '/' : `/${route}`;
    const canonicalUrl = `${window.location.origin}${cleanPath}`;
    canonical.setAttribute('href', canonicalUrl);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', canonicalUrl);
    }

    const titles: Record<AppRoute, string> = {
      home: 'DNS Locator – Global DNS Propagation & Record Lookup',
      about: 'About – DNS Locator',
      contact: 'Contact – DNS Locator',
      privacy: 'Privacy Policy & GDPR – DNS Locator',
      terms: 'Terms and Conditions – DNS Locator',
      disclaimer: 'Disclaimer – DNS Locator',
      'cookies-policy': 'Cookies Policy – DNS Locator',
      'cookies-notice': 'Cookies Notice – DNS Locator',
      'not-found': 'Page Not Found – DNS Locator',
    };
    document.title = titles[route];
  }, [route, propagationData, allRecordsData]);

  const navigate = useCallback((nextRoute: AppRoute, hash?: string) => {
    const nextPath = nextRoute === 'home' ? '/' : `/${nextRoute}`;
    window.history.pushState({}, '', `${nextPath}${hash ?? ''}`);
    setCurrentPath(nextPath);
    setRoute(nextRoute);
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const fetchPropagation = useCallback(
    async (domain: string, type: DnsRecordType, forceRefresh: boolean) => {
      const cacheKey = `prop:${type}:${domain}`;
      if (!forceRefresh) {
        const cached = getCachedResult<PropagationResponse>(cacheKey);
        if (cached) {
          setPropagationData({
            ...cached.data,
            cached: true,
            cacheExpiresAt: new Date(cached.expiresAt).toISOString(),
          });
          setPropError(null);
          return true;
        }
      }

      setIsPropLoading(true);
      setPropError(null);
      try {
        const refreshParam = forceRefresh ? '&refresh=1' : '';
        const res = await fetch(
          `/api/propagation?domain=${encodeURIComponent(domain)}&type=${type}${refreshParam}`
        );
        const json = await res.json();
        if (!res.ok) {
          setPropError(json.error || `Propagation check failed (HTTP ${res.status}).`);
          return false;
        }
        setCachedResult(cacheKey, json);
        setPropagationData(json as PropagationResponse);
        return true;
      } catch {
        setPropError('Unable to reach regional DNS service. Please check your connection and retry.');
        return false;
      } finally {
        setIsPropLoading(false);
      }
    },
    []
  );

  const fetchAllRecords = useCallback(async (domain: string, forceRefresh: boolean) => {
    const cacheKey = `all:${domain}`;
    if (!forceRefresh) {
      const cached = getCachedResult<DnsLookupResponse>(cacheKey);
      if (cached) {
        setAllRecordsData({
          ...cached.data,
          cached: true,
          cacheExpiresAt: new Date(cached.expiresAt).toISOString(),
        });
        setAllError(null);
        return true;
      }
    }

    setIsAllLoading(true);
    setAllError(null);
    try {
      const refreshParam = forceRefresh ? '&refresh=1' : '';
      const res = await fetch(`/api/dns?domain=${encodeURIComponent(domain)}${refreshParam}`);
      const json = await res.json();
      if (!res.ok) {
        setAllError(json.error || `DNS zone lookup failed (HTTP ${res.status}).`);
        return false;
      }
      setCachedResult(cacheKey, json);
      setAllRecordsData(json as DnsLookupResponse);
      return true;
    } catch {
      setAllError('Unable to reach DNS lookup service. Please retry.');
      return false;
    } finally {
      setIsAllLoading(false);
    }
  }, []);

  const executeLookup = useCallback(
    async (
      inputOverride?: string,
      opts?: {
        targetType?: DnsRecordType;
        forceRefresh?: boolean;
        propagationOnly?: boolean;
      }
    ) => {
      const activeType = opts?.targetType ?? recordType;
      const activeInput = inputOverride ?? rawInput;
      const forceRefresh = opts?.forceRefresh ?? false;

      const parsed = sanitizeDomainInput(activeInput, activeType);
      if (!parsed.isValid) {
        setInputError(parsed.reason ?? 'Please enter a valid domain name.');
        return;
      }

      if (parsed.wasModified && inputOverride === undefined) {
        setRawInput(parsed.domain);
      }

      setInputError(null);

      if (opts?.propagationOnly && allRecordsData?.domain === parsed.domain && !forceRefresh) {
        await fetchPropagation(parsed.domain, activeType, forceRefresh);
      } else {
        await Promise.all([
          fetchPropagation(parsed.domain, activeType, forceRefresh),
          fetchAllRecords(parsed.domain, forceRefresh),
        ]);
      }

      setRecentLookups(
        addRecentLookup({
          domain: parsed.domain,
          mode: 'propagation',
          recordType: activeType,
        })
      );
    },
    [recordType, rawInput, allRecordsData?.domain, fetchPropagation, fetchAllRecords]
  );

  // Support optional ?domain= deep links on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramDomain = params.get('domain');
    const paramType = params.get('type')?.toUpperCase() as DnsRecordType | undefined;
    if (paramDomain && route === 'home') {
      const nextType =
        paramType && PROPAGATION_RECORD_TYPES.includes(paramType) ? paramType : 'A';
      setRawInput(paramDomain);
      setRecordType(nextType);
      executeLookup(paramDomain, { targetType: nextType });
    }
    // Run only once on initial page load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      executeLookup();
    }, 80);
  };

  const handleQuickDomain = (domain: string) => {
    setRawInput(domain);
    executeLookup(domain);
  };

  const handleRecordTypeChange = (nextType: DnsRecordType) => {
    setRecordType(nextType);
    const targetDomain = sanitizedPreview.isValid
      ? sanitizedPreview.domain
      : propagationData?.domain ?? allRecordsData?.domain;
    if (targetDomain) {
      executeLookup(targetDomain, {
        targetType: nextType,
        propagationOnly: allRecordsData?.domain === targetDomain,
      });
    }
  };

  const handleClearCache = () => {
    const removed = clearAllDnsCache();
    setCacheBanner(
      removed > 0
        ? `Cleared ${removed} cached lookup${removed === 1 ? '' : 's'}`
        : 'Local cache is already empty'
    );
    setTimeout(() => setCacheBanner(null), 2600);
  };

  const handleCopyShareLink = async () => {
    const domain = propagationData?.domain ?? allRecordsData?.domain;
    if (!domain) return;
    const shareUrl = `${window.location.origin}/?domain=${encodeURIComponent(domain)}&type=${recordType}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleSnapshotCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setSnapshotCopiedKey(key);
      setTimeout(() => setSnapshotCopiedKey((prev) => (prev === key ? null : prev)), 1500);
    } catch {
      // Ignore clipboard failures
    }
  };

  const activeDomain = propagationData?.domain ?? allRecordsData?.domain ?? null;
  const combinedPropError = inputError ?? propError;
  const combinedAllError = inputError ?? allError;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 transition-colors">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-[68px] flex items-center justify-between gap-4 sm:gap-6">
          {/* Zone 1: Brand mark & larger wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('home');
            }}
            className="inline-flex items-center gap-2.5 sm:gap-3 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 font-[var(--font-display)]"
          >
            <img
              src="/favicon.svg"
              alt=""
              width={32}
              height={32}
              className="w-7 h-7 sm:w-8 sm:h-8 shrink-0"
            />
            <span>DNS Locator</span>
          </a>

          {/* Zone 2: Concise navigation links (legal pages moved to footer) */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <button
              type="button"
              onClick={() => {
                navigate('home');
                setView('overview');
              }}
              className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route === 'home' && view === 'overview'
                  ? 'text-sky-700 dark:text-sky-400 font-semibold'
                  : ''
              }`}
            >
              {t('navOverview')}
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('home');
                setView('all');
              }}
              className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route === 'home' && view === 'all'
                  ? 'text-sky-700 dark:text-sky-400 font-semibold'
                  : ''
              }`}
            >
              {t('navAllRecords')}
            </button>
            <button
              type="button"
              onClick={() => navigate('home', '#dns-guide')}
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t('navDnsGuide')}
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-2 shrink-0">
            {!isInstalled ? (
              <PWAInstallButton variant="header" />
            ) : (
              <button
                type="button"
                onClick={handleClearCache}
                className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                <span>{t('clearCache')}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-7 sm:py-9">
        {cacheBanner && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between"
          >
            <span>{cacheBanner}</span>
            <button
              type="button"
              onClick={() => setCacheBanner(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {route === 'not-found' ? (
          <NotFoundTemplate
            pathname={currentPath}
            onNavigateHome={() => navigate('home')}
            onNavigatePage={(p) => navigate(p)}
          />
        ) : route !== 'home' ? (
          <LegalPages
            page={route}
            onNavigateHome={() => navigate('home')}
            onNavigatePage={(p) => navigate(p)}
            onConsentChanged={() => setConsentVersion((v) => v + 1)}
          />
        ) : (
          <>
            {/* Hero & Workspace Controls */}
            <section aria-labelledby="hero-heading" className="mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="max-w-2xl">
                  <h1
                    id="hero-heading"
                    className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight"
                    style={{ textWrap: 'balance' }}
                  >
                    {t('heroTitle')}
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1.5">
                    {t('heroSubtitle')}
                  </p>
                </div>

                {/* English Revert (only after IP regional translation) + Icon-only Theme Switcher + Cache */}
                <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
                  {/* Show English button only after language has been switched from English via IP */}
                  {lang !== 'en' && (
                    <button
                      type="button"
                      onClick={switchToEnglish}
                      className="h-9 px-3 rounded-lg border border-sky-600 dark:border-sky-500 bg-[#0284C7] dark:bg-sky-500 text-white dark:text-slate-950 hover:bg-[#0369A1] dark:hover:bg-sky-400 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>{t('englishBtn')}</span>
                    </button>
                  )}

                  {/* Icon-only Light / Dark Mode Switch */}
                  <button
                    type="button"
                    onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                    aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
                    title={theme === 'dark' ? t('lightMode') : t('darkMode')}
                    className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    ) : (
                      <Moon className="w-4 h-4 text-slate-600" aria-hidden="true" />
                    )}
                  </button>

                  {!isInstalled && (
                    <button
                      type="button"
                      onClick={handleClearCache}
                      className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                      <span>{t('clearCache')}</span>
                    </button>
                  )}

                  {activeDomain && (
                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {shareCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          <span>{t('linkCopied')}</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                          <span>{t('shareLink')}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Search Bar Card — Hero Spotlight */}
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border-2 border-sky-200/80 dark:border-sky-800/70 bg-gradient-to-br from-white via-sky-50/45 to-cyan-50/55 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/40 shadow-lg shadow-sky-900/5 dark:shadow-black/30 p-4 sm:p-8 lg:p-10 space-y-4 sm:space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-sky-700 dark:text-sky-400">
                    <Zap className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t('searchCardKicker')}</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('searchCardMeta')}
                  </span>
                </div>

                <div className="flex flex-col lg:flex-row gap-2.5 sm:gap-3">
                  <div className="relative flex-1 min-w-0" dir="ltr">
                    <Search
                      className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 dark:text-sky-400 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <label htmlFor="domain-input" className="sr-only">
                      {t('domainPlaceholder')}
                    </label>
                    <input
                      ref={domainInputRef}
                      id="domain-input"
                      type="text"
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      placeholder={t('domainPlaceholder')}
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full h-12 sm:h-15 pl-10 sm:pl-12 pr-4 sm:pr-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/90 text-sm sm:text-lg font-mono text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                    />
                    {!rawInput && (
                      <kbd
                        aria-hidden="true"
                        className="hidden sm:inline-flex items-center justify-center px-2 py-1 text-xs font-mono text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                      >
                        /
                      </kbd>
                    )}
                  </div>

                  <div className="flex flex-nowrap items-center gap-1.5 sm:gap-3 shrink-0 w-full lg:w-auto">
                    {/* Record Type Dropdown integrated in Search Bar — compact on phone screens */}
                    <label htmlFor="record-type-select" className="sr-only">
                      {t('recordTypeLabel')}
                    </label>
                    <select
                      id="record-type-select"
                      aria-label={t('recordTypeLabel')}
                      value={recordType}
                      onChange={(e) => handleRecordTypeChange(e.target.value as DnsRecordType)}
                      dir="ltr"
                      className="h-11 sm:h-15 w-[78px] sm:w-auto sm:min-w-[104px] px-2 sm:px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/90 text-xs sm:text-base font-mono font-bold text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer shrink-0 transition-all"
                    >
                      {PROPAGATION_RECORD_TYPES.map((type) => (
                        <option
                          key={type}
                          value={type}
                          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        >
                          {type}
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 lg:flex-initial min-w-0 h-11 sm:h-15 px-3 sm:px-8 rounded-xl bg-gradient-to-r from-[#0284C7] to-cyan-600 hover:from-[#0369A1] hover:to-cyan-700 dark:from-sky-500 dark:to-cyan-400 dark:hover:from-sky-400 dark:hover:to-cyan-300 disabled:opacity-60 text-white dark:text-slate-950 text-xs sm:text-base font-bold shadow-md shadow-sky-600/20 dark:shadow-sky-500/15 inline-flex items-center justify-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap cursor-pointer"
                    >
                      <span>{isLoading ? t('checkingBtn') : t('lookupBtn')}</span>
                      <ArrowRight className="w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0" aria-hidden="true" />
                    </button>

                    {(propagationData || allRecordsData) && (
                      <button
                        type="button"
                        disabled={isLoading || (!sanitizedPreview.isValid && !activeDomain)}
                        onClick={() =>
                          executeLookup(activeDomain ?? undefined, { forceRefresh: true })
                        }
                        title="Bypass 5-minute cache and fetch live records"
                        aria-label="Force refresh live DNS records"
                        className="h-11 w-11 sm:h-15 sm:w-15 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center justify-center transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${isLoading ? 'animate-spin' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Recent Searches Bar (in place of record strip) & Live Hostname Sanitization */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200/70 dark:border-slate-800/80 text-xs sm:text-sm text-slate-500 dark:text-slate-400 min-h-[38px]">
                  <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                      <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                      <span>{t('recentLabel')}</span>
                    </span>

                    {recentLookups.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2" dir="ltr">
                        {recentLookups.slice(0, 6).map((entry) => (
                          <button
                            key={`${entry.domain}-${entry.mode}-${entry.recordType ?? ''}`}
                            type="button"
                            onClick={() => {
                              const nextType =
                                (entry.recordType as DnsRecordType | undefined) ?? recordType;
                              setRawInput(entry.domain);
                              setRecordType(nextType);
                              executeLookup(entry.domain, { targetType: nextType });
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white/90 dark:bg-slate-950/80 hover:border-sky-400 dark:hover:border-sky-600 hover:text-sky-700 dark:hover:text-sky-300 font-mono text-xs sm:text-sm text-slate-700 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer"
                          >
                            <span>{entry.domain}</span>
                            {entry.recordType && (
                              <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400">
                                {entry.recordType}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">
                        {t('noRecentSearches')}
                      </span>
                    )}
                  </div>

                  {((rawInput.trim() && sanitizedPreview.wasModified && sanitizedPreview.isValid) ||
                    (sanitizedPreview.isValid &&
                      sanitizedPreview.apexDomain !== sanitizedPreview.domain)) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 shrink-0 text-xs sm:text-sm">
                      {rawInput.trim() &&
                        sanitizedPreview.wasModified &&
                        sanitizedPreview.isValid && (
                          <span>
                            {t('hostnameLabel')}{' '}
                            <strong className="font-mono text-slate-800 dark:text-slate-200" dir="ltr">
                              {sanitizedPreview.domain}
                            </strong>
                          </span>
                        )}

                      {sanitizedPreview.isValid &&
                        sanitizedPreview.apexDomain !== sanitizedPreview.domain && (
                          <button
                            type="button"
                            onClick={() => handleQuickDomain(sanitizedPreview.apexDomain)}
                            className="text-sky-700 dark:text-sky-400 hover:underline font-medium"
                          >
                            {t('checkApex')} ({sanitizedPreview.apexDomain})
                          </button>
                        )}
                    </div>
                  )}
                </div>
              </form>
            </section>

            {/* Unified Workspace View Tabs */}
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="Diagnostic workspace views"
                className="inline-flex items-center p-1 rounded-lg bg-slate-200/70 dark:bg-slate-900 border border-transparent dark:border-slate-800 self-start overflow-x-auto max-w-full"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'overview'}
                  onClick={() => setView('overview')}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                    view === 'overview'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t('tabOverview')}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'all'}
                  onClick={() => setView('all')}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 tabular-nums ${
                    view === 'all'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {t('tabAllRecords')}{allRecordsData ? ` (${allRecordsData.records.length})` : ''}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'regions'}
                  onClick={() => setView('regions')}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 tabular-nums ${
                    view === 'regions'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t('tabGlobalRegions')}</span>
                </button>
              </div>

              {activeDomain && (
                <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 tabular-nums">
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200" dir="ltr">
                    {activeDomain}
                  </span>
                  {allRecordsData && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck
                          className={`w-3.5 h-3.5 ${
                            allRecordsData.dnssecValidated
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                          aria-hidden="true"
                        />
                        <span>
                          {allRecordsData.dnssecValidated ? t('dnssecValid') : t('dnssecUnsigned')}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Workspace View Content */}
            {view === 'overview' && (
              <div className="space-y-5">
                {/* Real Live Zone Records Snapshot */}
                {(isAllLoading || allRecordsData) && (
                  <section
                    aria-label={t('liveZoneRecords')}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {t('liveZoneRecords')}
                        </h2>
                        {allRecordsData && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                            <span className="text-slate-600 dark:text-slate-300 tabular-nums">
                              {allRecordsData.records.length} {t('recordsFound')}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                            <span
                              className={
                                allRecordsData.emailHealth.hasMx
                                  ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                  : 'text-amber-700 dark:text-amber-400 font-medium'
                              }
                            >
                              MX {allRecordsData.emailHealth.hasMx ? t('okLabel') : t('missingLabel')}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                            <span
                              className={
                                allRecordsData.emailHealth.hasSpf
                                  ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                  : 'text-amber-700 dark:text-amber-400 font-medium'
                              }
                            >
                              SPF {allRecordsData.emailHealth.hasSpf ? t('okLabel') : t('missingLabel')}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                            <span
                              className={
                                allRecordsData.emailHealth.hasDmarc
                                  ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                  : 'text-amber-700 dark:text-amber-400 font-medium'
                              }
                            >
                              DMARC {allRecordsData.emailHealth.hasDmarc ? t('okLabel') : t('missingLabel')}
                            </span>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setView('all')}
                        className="text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline whitespace-nowrap shrink-0"
                      >
                        {t('openFullZoneTable')}
                      </button>
                    </div>

                    {isAllLoading && !allRecordsData ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {Array.from({ length: 8 }).map((_, idx) => (
                          <div
                            key={idx}
                            className="h-16 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 animate-pulse"
                          />
                        ))}
                      </div>
                    ) : (
                      allRecordsData && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {ALL_ZONE_RECORD_TYPES.map((type) => {
                            const items = allRecordsData.recordsByType[type] ?? [];
                            const first = items[0];
                            const copyKey = `snap-${type}`;
                            return (
                              <div
                                key={type}
                                dir="ltr"
                                className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3 flex flex-col justify-between gap-2 min-w-0"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleRecordTypeChange(type)}
                                    className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-sky-700 dark:text-sky-400 hover:underline"
                                    title={`Inspect ${type} global propagation`}
                                  >
                                    <span>{type}</span>
                                    <span className="text-slate-400 dark:text-slate-500 font-normal tabular-nums">
                                      ({items.length})
                                    </span>
                                  </button>

                                  {first ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                                        {formatTtl(first.ttl)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSnapshotCopy(
                                            copyKey,
                                            items.map((i) => i.data).join('\n')
                                          )
                                        }
                                        aria-label={`Copy ${type} record values`}
                                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                                      >
                                        {snapshotCopiedKey === copyKey ? (
                                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 dark:text-slate-600">
                                      {t('noneLabel')}
                                    </span>
                                  )}
                                </div>

                                {first ? (
                                  <div className="font-mono text-xs text-slate-900 dark:text-slate-100 truncate">
                                    {first.priority !== undefined ? `[${first.priority}] ` : ''}
                                    {first.data}
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-400 dark:text-slate-600">
                                    {t('noRecordPublished')}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}
                  </section>
                )}

                <PropagationResults
                  data={propagationData}
                  isLoading={isPropLoading}
                  error={combinedPropError}
                  expectedValue={expectedValue}
                  onExpectedValueChange={setExpectedValue}
                />
              </div>
            )}

            {view === 'all' && (
              <AllRecordsResults
                data={allRecordsData}
                isLoading={isAllLoading}
                error={combinedAllError}
                onInspectPropagationType={(nextType) => {
                  setRecordType(nextType);
                  setView('regions');
                  const target = allRecordsData?.domain ?? sanitizedPreview.domain;
                  if (target) {
                    executeLookup(target, { targetType: nextType, propagationOnly: true });
                  }
                }}
              />
            )}

            {view === 'regions' && (
              <PropagationResults
                data={propagationData}
                isLoading={isPropLoading}
                error={combinedPropError}
                expectedValue={expectedValue}
                onExpectedValueChange={setExpectedValue}
              />
            )}

            {/* Original Educational DNS Guide */}
            <DnsEducationGuide />
          </>
        )}
      </main>

      {/* Compliant Trust Footer with all 7 pages */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              {t('footerTagline')}
            </p>
            <p>{t('footerDisclaimer')}</p>
          </div>
          <nav
            aria-label="Footer legal and policy links"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 shrink-0"
          >
            <button
              type="button"
              onClick={() => navigate('about')}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap cursor-pointer"
            >
              {t('navAbout')}
            </button>
            <button
              type="button"
              onClick={() => navigate('contact')}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap cursor-pointer"
            >
              {t('navContact')}
            </button>
            <button
              type="button"
              onClick={() => navigate('privacy')}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap cursor-pointer"
            >
              {t('navPrivacy')}
            </button>
            <button
              type="button"
              onClick={() => navigate('terms')}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap cursor-pointer"
            >
              {t('navTerms')}
            </button>
            <button
              type="button"
              onClick={() => navigate('disclaimer')}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap cursor-pointer"
            >
              {t('navDisclaimer')}
            </button>
            <button
              type="button"
              onClick={() => navigate('cookies-policy')}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap cursor-pointer"
            >
              {t('navCookiesPolicy')}
            </button>
            <button
              type="button"
              onClick={() => navigate('cookies-notice')}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap cursor-pointer"
            >
              {t('navCookiesNotice')}
            </button>
          </nav>
        </div>
      </footer>

      {/* Move to Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Move to top"
          title="Move to top"
          className="fixed bottom-5 right-5 z-40 w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-400 shadow-lg backdrop-blur-sm flex items-center justify-center transition-all cursor-pointer"
        >
          <ArrowUp className="w-4 h-4" aria-hidden="true" />
        </button>
      )}

      {/* EU GDPR Cookie Notice Banner */}
      <CookieNoticeBanner
        consentVersion={consentVersion}
        onNavigatePage={(p) => navigate(p)}
        onConsentSaved={() => setConsentVersion((v) => v + 1)}
      />

      <OfflineIndicator />
    </div>
  );
}
