import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Check,
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
} from 'lucide-react';
import AllRecordsResults from './components/AllRecordsResults';
import DnsEducationGuide from './components/DnsEducationGuide';
import LegalPages, { type LegalPageRoute } from './components/LegalPages';
import OfflineIndicator from './components/OfflineIndicator';
import PropagationResults from './components/PropagationResults';
import PWAInstallButton from './components/PWAInstallButton';
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
import {
  ALL_ZONE_RECORD_TYPES,
  PROPAGATION_RECORD_TYPES,
  type DnsLookupResponse,
  type DnsRecordType,
  type PropagationResponse,
} from './types/dns';

type AppRoute = 'home' | LegalPageRoute;
type WorkspaceView = 'overview' | 'all' | 'regions';
type ThemeMode = 'light' | 'dark';

function getRouteFromPath(pathname: string): AppRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/about') return 'about';
  if (clean === '/privacy') return 'privacy';
  if (clean === '/terms') return 'terms';
  if (clean === '/contact') return 'contact';
  return 'home';
}

function getInitialTheme(): ThemeMode {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  return 'light';
}

export default function App() {
  const { isInstalled } = usePWAInstall();

  const [route, setRoute] = useState<AppRoute>(() =>
    getRouteFromPath(window.location.pathname)
  );
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [view, setView] = useState<WorkspaceView>('overview');
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
      setRoute(getRouteFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // SEO Protection: apply noindex on dynamic ?domain= query URLs & keep canonical pointed at root
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasQueryDomain = params.has('domain') || params.has('q');

    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (hasQueryDomain) {
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
    const cleanPath = route === 'home' ? '/' : `/${route}`;
    canonical.setAttribute('href', `${window.location.origin}${cleanPath}`);

    const titles: Record<AppRoute, string> = {
      home: 'dnslocator.online – Global DNS Propagation & Record Lookup',
      about: 'About – dnslocator.online',
      privacy: 'Privacy Policy – dnslocator.online',
      terms: 'Terms of Service – dnslocator.online',
      contact: 'Contact – dnslocator.online',
    };
    document.title = titles[route];
  }, [route, propagationData, allRecordsData]);

  const navigate = useCallback((nextRoute: AppRoute, hash?: string) => {
    const nextPath = nextRoute === 'home' ? '/' : `/${nextRoute}`;
    window.history.pushState({}, '', `${nextPath}${hash ?? ''}`);
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
      setAllError('Unable to reach Cloudflare 1.1.1.1 lookup service. Please retry.');
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

      // Run both All-Records Zone lookup (A, AAAA, CNAME, MX, TXT, NS, SOA, CAA)
      // and 18-Region Propagation check concurrently so visitors always get full real data.
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Brand mark & wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('home');
            }}
            className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 font-[var(--font-display)]"
          >
            <img
              src="/favicon.svg"
              alt=""
              width={24}
              height={24}
              className="w-6 h-6 shrink-0"
            />
            <span>dnslocator.online</span>
          </a>

          {/* Zone 2: 4 concise single-line text links */}
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
              className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                route === 'home' && view === 'overview'
                  ? 'text-sky-700 dark:text-sky-400 font-semibold'
                  : ''
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('home');
                setView('all');
              }}
              className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                route === 'home' && view === 'all'
                  ? 'text-sky-700 dark:text-sky-400 font-semibold'
                  : ''
              }`}
            >
              All Records
            </button>
            <button
              type="button"
              onClick={() => navigate('home', '#dns-guide')}
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              DNS Guide
            </button>
            <button
              type="button"
              onClick={() => navigate('about')}
              className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                route === 'about' ? 'text-sky-700 dark:text-sky-400 font-semibold' : ''
              }`}
            >
              About
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            {!isInstalled ? (
              <PWAInstallButton variant="header" />
            ) : (
              <button
                type="button"
                onClick={handleClearCache}
                className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                <span>Clear Cache</span>
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

        {route !== 'home' ? (
          <LegalPages
            page={route}
            onNavigateHome={() => navigate('home')}
            onNavigatePage={(p) => navigate(p)}
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
                    Global DNS Propagation &amp; Record Lookup
                  </h1>
                </div>

                {/* Theme Switcher, Share & Cache Toolbar */}
                <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </button>

                  {!isInstalled && (
                    <button
                      type="button"
                      onClick={handleClearCache}
                      className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                      <span>Clear Cache</span>
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
                          <span>Link Copied</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                          <span>Share Link</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Search Bar Card */}
              <form
                onSubmit={handleSubmit}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search
                      className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <label htmlFor="domain-input" className="sr-only">
                      Domain name or URL
                    </label>
                    <input
                      ref={domainInputRef}
                      id="domain-input"
                      type="text"
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      placeholder="Enter domain or paste URL (e.g., https://example.com/pricing)"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full h-11 pl-10 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/70 focus:bg-white dark:focus:bg-slate-950 text-sm sm:text-base font-mono text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                    {!rawInput && (
                      <kbd
                        aria-hidden="true"
                        className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-mono text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      >
                        /
                      </kbd>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 sm:flex-initial h-11 px-6 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] dark:bg-sky-500 dark:hover:bg-sky-400 disabled:opacity-60 text-white dark:text-slate-950 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isLoading ? 'Checking…' : 'Lookup'}
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
                        className="h-11 w-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center justify-center transition-colors shrink-0 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Record-Type Quick Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
                  <div
                    role="group"
                    aria-label="Propagation DNS record type"
                    className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-950/80 border border-slate-200/70 dark:border-slate-800 overflow-x-auto"
                  >
                    {PROPAGATION_RECORD_TYPES.map((type) => {
                      const active = recordType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleRecordTypeChange(type)}
                          aria-pressed={active}
                          className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-400 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>

                  {/* Live Sanitization & Recent Lookups */}
                  {((rawInput.trim() && sanitizedPreview.wasModified && sanitizedPreview.isValid) ||
                    (sanitizedPreview.isValid &&
                      sanitizedPreview.apexDomain !== sanitizedPreview.domain) ||
                    recentLookups.length > 0) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {rawInput.trim() &&
                        sanitizedPreview.wasModified &&
                        sanitizedPreview.isValid && (
                          <span>
                            Hostname:{' '}
                            <strong className="font-mono text-slate-800 dark:text-slate-200">
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
                            Check apex ({sanitizedPreview.apexDomain})
                          </button>
                        )}

                      {recentLookups.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span>Recent:</span>
                          {recentLookups.slice(0, 4).map((entry, idx) => (
                            <span
                              key={`${entry.domain}-${entry.mode}-${entry.recordType ?? ''}`}
                              className="inline-flex items-center gap-2"
                            >
                              {idx > 0 && (
                                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                                  /
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const nextType =
                                    (entry.recordType as DnsRecordType | undefined) ?? recordType;
                                  setRawInput(entry.domain);
                                  setRecordType(nextType);
                                  executeLookup(entry.domain, { targetType: nextType });
                                }}
                                className="font-mono text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-400 hover:underline"
                              >
                                {entry.domain}
                              </button>
                            </span>
                          ))}
                        </div>
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
                  <span>Overview</span>
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
                    All Records{allRecordsData ? ` (${allRecordsData.records.length})` : ''}
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
                  <span>
                    Global Regions (18)
                  </span>
                </button>
              </div>

              {activeDomain && (
                <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 tabular-nums">
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
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
                        <span>{allRecordsData.dnssecValidated ? 'DNSSEC Valid' : 'DNSSEC Unsigned'}</span>
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Workspace View Content */}
            {view === 'overview' && (
              <div className="space-y-5">
                {/* Real Live Zone Records Snapshot (shown once a lookup starts or finishes) */}
                {(isAllLoading || allRecordsData) && (
                  <section
                    aria-label="Live zone DNS records summary"
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Live DNS Zone Records
                        </h2>
                        {allRecordsData && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                            <span className="text-slate-600 dark:text-slate-300 tabular-nums">
                              {allRecordsData.records.length} records found
                            </span>
                            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                            <span
                              className={
                                allRecordsData.emailHealth.hasMx
                                  ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                  : 'text-amber-700 dark:text-amber-400 font-medium'
                              }
                            >
                              MX {allRecordsData.emailHealth.hasMx ? 'OK' : 'Missing'}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                            <span
                              className={
                                allRecordsData.emailHealth.hasSpf
                                  ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                  : 'text-amber-700 dark:text-amber-400 font-medium'
                              }
                            >
                              SPF {allRecordsData.emailHealth.hasSpf ? 'OK' : 'Missing'}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                            <span
                              className={
                                allRecordsData.emailHealth.hasDmarc
                                  ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                  : 'text-amber-700 dark:text-amber-400 font-medium'
                              }
                            >
                              DMARC {allRecordsData.emailHealth.hasDmarc ? 'OK' : 'Missing'}
                            </span>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setView('all')}
                        className="text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline whitespace-nowrap shrink-0"
                      >
                        Open Full Zone Table →
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
                                      None
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
                                    No {type} record published
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

      {/* Compliant Trust Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="space-y-1">
            <p className="font-medium text-slate-700 dark:text-slate-200">
              dnslocator.online · Public DNS Propagation &amp; Record Diagnostic Utility
            </p>
            <p>
              Displays publicly available DNS records queried via Cloudflare 1.1.1.1 DoH and regional resolvers. Not affiliated with ICANN or domain registrars.
            </p>
          </div>
          <nav aria-label="Footer legal links" className="flex flex-wrap items-center gap-5 shrink-0">
            <button
              type="button"
              onClick={() => navigate('about')}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => navigate('privacy')}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => navigate('terms')}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => navigate('contact')}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap"
            >
              Contact
            </button>
          </nav>
        </div>
      </footer>

      <OfflineIndicator />
    </div>
  );
}
