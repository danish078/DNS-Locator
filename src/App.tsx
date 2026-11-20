import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { RefreshCw, Search, Trash2 } from 'lucide-react';
import AllRecordsResults from './components/AllRecordsResults';
import DnsEducationGuide from './components/DnsEducationGuide';
import LegalPages, { type LegalPageRoute } from './components/LegalPages';
import PropagationResults from './components/PropagationResults';
import {
  addRecentLookup,
  clearAllDnsCache,
  getCachedResult,
  getRecentLookups,
  setCachedResult,
  type RecentLookupEntry,
} from './lib/cache';
import { sanitizeDomainInput } from './lib/domain';
import {
  PROPAGATION_RECORD_TYPES,
  type DnsLookupResponse,
  type DnsRecordType,
  type PropagationResponse,
} from './types/dns';

type AppRoute = 'home' | LegalPageRoute;
type LookupMode = 'propagation' | 'all';

function getRouteFromPath(pathname: string): AppRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/about') return 'about';
  if (clean === '/privacy') return 'privacy';
  if (clean === '/terms') return 'terms';
  if (clean === '/contact') return 'contact';
  return 'home';
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() =>
    getRouteFromPath(window.location.pathname)
  );
  const [mode, setMode] = useState<LookupMode>('propagation');
  const [rawInput, setRawInput] = useState('');
  const [recordType, setRecordType] = useState<DnsRecordType>('A');
  const [expectedValue, setExpectedValue] = useState('');

  const [propagationData, setPropagationData] = useState<PropagationResponse | null>(null);
  const [allRecordsData, setAllRecordsData] = useState<DnsLookupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheBanner, setCacheBanner] = useState<string | null>(null);
  const [recentLookups, setRecentLookups] = useState<RecentLookupEntry[]>(() =>
    getRecentLookups()
  );

  const debounceTimerRef = useRef<number | null>(null);

  const sanitizedPreview = useMemo(
    () => sanitizeDomainInput(rawInput, mode === 'propagation' ? recordType : undefined),
    [rawInput, mode, recordType]
  );

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

  const executeLookup = useCallback(
    async (
      inputOverride?: string,
      opts?: {
        targetMode?: LookupMode;
        targetType?: DnsRecordType;
        forceRefresh?: boolean;
      }
    ) => {
      const activeMode = opts?.targetMode ?? mode;
      const activeType = opts?.targetType ?? recordType;
      const activeInput = inputOverride ?? rawInput;
      const forceRefresh = opts?.forceRefresh ?? false;

      const parsed = sanitizeDomainInput(
        activeInput,
        activeMode === 'propagation' ? activeType : undefined
      );

      if (!parsed.isValid) {
        setError(parsed.reason ?? 'Please enter a valid domain name.');
        return;
      }

      if (parsed.wasModified && inputOverride === undefined) {
        setRawInput(parsed.domain);
      }

      setError(null);

      const cacheKey =
        activeMode === 'propagation'
          ? `prop:${activeType}:${parsed.domain}`
          : `all:${parsed.domain}`;

      if (!forceRefresh) {
        const cached = getCachedResult<PropagationResponse | DnsLookupResponse>(cacheKey);
        if (cached) {
          if (activeMode === 'propagation') {
            setPropagationData({
              ...(cached.data as PropagationResponse),
              cached: true,
              cacheExpiresAt: new Date(cached.expiresAt).toISOString(),
            });
          } else {
            setAllRecordsData({
              ...(cached.data as DnsLookupResponse),
              cached: true,
              cacheExpiresAt: new Date(cached.expiresAt).toISOString(),
            });
          }
          setRecentLookups(
            addRecentLookup({
              domain: parsed.domain,
              mode: activeMode,
              recordType: activeMode === 'propagation' ? activeType : undefined,
            })
          );
          return;
        }
      }

      setIsLoading(true);
      try {
        const refreshParam = forceRefresh ? '&refresh=1' : '';
        const url =
          activeMode === 'propagation'
            ? `/api/propagation?domain=${encodeURIComponent(parsed.domain)}&type=${activeType}${refreshParam}`
            : `/api/dns?domain=${encodeURIComponent(parsed.domain)}${refreshParam}`;

        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || `Lookup failed (HTTP ${res.status}).`);
          return;
        }

        setCachedResult(cacheKey, json);
        if (activeMode === 'propagation') {
          setPropagationData(json as PropagationResponse);
        } else {
          setAllRecordsData(json as DnsLookupResponse);
        }
        setRecentLookups(
          addRecentLookup({
            domain: parsed.domain,
            mode: activeMode,
            recordType: activeMode === 'propagation' ? activeType : undefined,
          })
        );
      } catch {
        setError('Unable to reach DNS lookup service. Please check your connection and retry.');
      } finally {
        setIsLoading(false);
      }
    },
    [mode, recordType, rawInput]
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
      executeLookup(paramDomain, { targetMode: 'propagation', targetType: nextType });
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

  const handleClearCache = () => {
    const removed = clearAllDnsCache();
    setCacheBanner(
      removed > 0
        ? `Cleared ${removed} cached lookup${removed === 1 ? '' : 's'}`
        : 'Local cache is already empty'
    );
    setTimeout(() => setCacheBanner(null), 2600);
  };

  const handleSwitchMode = (nextMode: LookupMode) => {
    setMode(nextMode);
    setError(null);
    if (sanitizedPreview.isValid) {
      if (
        (nextMode === 'propagation' &&
          (!propagationData ||
            propagationData.domain !== sanitizedPreview.domain ||
            propagationData.recordType !== recordType)) ||
        (nextMode === 'all' &&
          (!allRecordsData || allRecordsData.domain !== sanitizedPreview.domain))
      ) {
        executeLookup(sanitizedPreview.domain, { targetMode: nextMode });
      }
    }
  };

  const handleRecordTypeChange = (nextType: DnsRecordType) => {
    setRecordType(nextType);
    if (mode === 'propagation' && sanitizedPreview.isValid) {
      executeLookup(sanitizedPreview.domain, {
        targetMode: 'propagation',
        targetType: nextType,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand mark & wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('home');
            }}
            className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-[var(--font-display)]"
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
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <button
              type="button"
              onClick={() => {
                navigate('home');
                handleSwitchMode('propagation');
              }}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Propagation
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('home');
                handleSwitchMode('all');
              }}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              All Records
            </button>
            <button
              type="button"
              onClick={() => navigate('home', '#dns-guide')}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              DNS Guide
            </button>
            <button
              type="button"
              onClick={() => navigate('about')}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              About
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleClearCache}
              className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>Clear Cache</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {cacheBanner && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-700 flex items-center justify-between"
          >
            <span>{cacheBanner}</span>
            <button
              type="button"
              onClick={() => setCacheBanner(null)}
              className="text-slate-400 hover:text-slate-700"
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
            {/* Hero & Lookup Console */}
            <section aria-labelledby="hero-heading" className="mb-6">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
                <div className="max-w-2xl">
                  <h1
                    id="hero-heading"
                    className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight"
                    style={{ textWrap: 'balance' }}
                  >
                    Global DNS Propagation &amp; Record Lookup
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 mt-2">
                    Check DNS propagation across 18 worldwide regions or inspect every zone record in parallel via Cloudflare 1.1.1.1 DoH.
                  </p>
                </div>

                {/* Mode Switcher */}
                <div
                  role="tablist"
                  aria-label="Lookup mode"
                  className="inline-flex items-center p-1 rounded-lg bg-slate-200/70 self-start lg:self-auto shrink-0"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'propagation'}
                    onClick={() => handleSwitchMode('propagation')}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      mode === 'propagation'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Global Propagation
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'all'}
                    onClick={() => handleSwitchMode('all')}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      mode === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Records (1.1.1.1)
                  </button>
                </div>
              </div>

              {/* Search Bar Card */}
              <form
                onSubmit={handleSubmit}
                className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <label htmlFor="domain-input" className="sr-only">
                      Domain name or URL
                    </label>
                    <input
                      id="domain-input"
                      type="text"
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      placeholder="Enter domain or paste URL (e.g., https://example.com/pricing)"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white text-sm sm:text-base font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>

                  {mode === 'propagation' && (
                    <div className="sm:w-32 shrink-0">
                      <label htmlFor="record-type-select" className="sr-only">
                        DNS Record Type
                      </label>
                      <select
                        id="record-type-select"
                        value={recordType}
                        onChange={(e) =>
                          handleRecordTypeChange(e.target.value as DnsRecordType)
                        }
                        className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        {PROPAGATION_RECORD_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 sm:flex-initial h-11 px-6 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isLoading ? 'Checking…' : 'Lookup'}
                    </button>

                    {(propagationData || allRecordsData) && (
                      <button
                        type="button"
                        disabled={isLoading || !sanitizedPreview.isValid}
                        onClick={() => executeLookup(undefined, { forceRefresh: true })}
                        title="Bypass 5-minute cache and fetch live records"
                        aria-label="Force refresh live DNS records"
                        className="h-11 w-11 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 inline-flex items-center justify-center transition-colors shrink-0 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Sanitization & Recent Lookups Metadata Row (unboxed typography) */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {rawInput.trim() && sanitizedPreview.wasModified && sanitizedPreview.isValid ? (
                      <span>
                        Normalized hostname:{' '}
                        <strong className="font-mono text-slate-800">
                          {sanitizedPreview.domain}
                        </strong>
                      </span>
                    ) : (
                      <span>
                        Resolver: Cloudflare 1.1.1.1 DoH &amp; 18 Global Nodes · 5m Cache
                      </span>
                    )}

                    {sanitizedPreview.isValid &&
                      sanitizedPreview.apexDomain !== sanitizedPreview.domain && (
                        <>
                          <span aria-hidden="true">·</span>
                          <button
                            type="button"
                            onClick={() => handleQuickDomain(sanitizedPreview.apexDomain)}
                            className="text-sky-700 hover:underline font-medium"
                          >
                            Check apex ({sanitizedPreview.apexDomain})
                          </button>
                        </>
                      )}
                  </div>

                  {recentLookups.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span>Recent:</span>
                      {recentLookups.slice(0, 4).map((entry, idx) => (
                        <span
                          key={`${entry.domain}-${entry.mode}-${entry.recordType ?? ''}`}
                          className="inline-flex items-center gap-2"
                        >
                          {idx > 0 && (
                            <span className="text-slate-300" aria-hidden="true">
                              /
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setRawInput(entry.domain);
                              setMode(entry.mode);
                              if (entry.recordType) {
                                setRecordType(entry.recordType as DnsRecordType);
                              }
                              executeLookup(entry.domain, {
                                targetMode: entry.mode,
                                targetType: entry.recordType as DnsRecordType | undefined,
                              });
                            }}
                            className="font-mono text-slate-700 hover:text-sky-700 hover:underline"
                          >
                            {entry.domain}
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </section>

            {/* Results Viewport (Reserved Height Prevents CLS) */}
            {mode === 'propagation' ? (
              <PropagationResults
                data={propagationData}
                isLoading={isLoading}
                error={error}
                expectedValue={expectedValue}
                onExpectedValueChange={setExpectedValue}
                onQuickDomain={handleQuickDomain}
              />
            ) : (
              <AllRecordsResults
                data={allRecordsData}
                isLoading={isLoading}
                error={error}
                onQuickDomain={handleQuickDomain}
              />
            )}

            {/* Original Educational DNS Guide */}
            <DnsEducationGuide />
          </>
        )}
      </main>

      {/* Compliant Trust Footer */}
      <footer className="border-t border-slate-200 bg-white mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="space-y-1">
            <p className="font-medium text-slate-700">
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
              className="hover:text-slate-900 hover:underline whitespace-nowrap"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => navigate('privacy')}
              className="hover:text-slate-900 hover:underline whitespace-nowrap"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => navigate('terms')}
              className="hover:text-slate-900 hover:underline whitespace-nowrap"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => navigate('contact')}
              className="hover:text-slate-900 hover:underline whitespace-nowrap"
            >
              Contact
            </button>
          </nav>
        </div>
      </footer>
    </div>
  );
}
