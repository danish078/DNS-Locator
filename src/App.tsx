import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  ArrowRight,
  ArrowUp,
  Check,
  Clock,
  Copy,
  Gamepad2,
  Globe,
  Moon,
  RefreshCw,
  Search,
  Server,
  Share2,
  ShieldCheck,
  Sun,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import AdSlotWrapper from './components/AdSlotWrapper';
import BlogSection from './components/BlogSection';
import CookieNoticeBanner, { getSavedCookieConsent } from './components/CookieNoticeBanner';
import DnsEducationGuide from './components/DnsEducationGuide';
import HeaderLogoEmblem from './components/HeaderLogoEmblem';
import LegalPages, { type LegalPageRoute } from './components/LegalPages';
import NewsSection from './components/NewsSection';
import OfflineIndicator from './components/OfflineIndicator';
import PWAInstallButton from './components/PWAInstallButton';
import RecordToolPage from './components/RecordToolPage';
import { GoneTemplate, NotFoundTemplate } from './components/StatusTemplates';
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
  getPageSeoMeta,
  parseAppRoute,
  type AppRoute,
} from './lib/seo';
import {
  initializeTracking,
  isAdSenseEnabled,
  trackAnalyticsPageView,
  trackDnsLookupEvent,
} from './lib/tracking';
import {
  ALL_ZONE_RECORD_TYPES,
  PROPAGATION_RECORD_TYPES,
  type DnsLookupResponse,
  type DnsRecordType,
  type PropagationResponse,
} from './types/dns';
import type { NewsArticle, NewsFeedResponse, NewsRelevance } from './types/news';

const AllRecordsResults = lazy(() => import('./components/AllRecordsResults'));
const DnsPacketGame = lazy(() => import('./components/DnsPacketGame'));
const DomainComparisonSection = lazy(() => import('./components/DomainComparisonSection'));
const DownloadReportButton = lazy(() => import('./components/DownloadReportButton'));
const GlobalHealthChart = lazy(() => import('./components/GlobalHealthChart'));
const PropagationResults = lazy(() => import('./components/PropagationResults'));

const VALID_NEWS_RELEVANCE = new Set<NewsRelevance>([
  'dns',
  'routing',
  'security',
  'infrastructure',
]);

function normalizeNewsFeedResponse(raw: unknown): NewsFeedResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Unexpected news response payload.');
  }
  const obj = raw as Record<string, unknown>;
  const nestedData =
    obj.data && typeof obj.data === 'object' ? (obj.data as Record<string, unknown>) : null;
  const candidateList = Array.isArray(obj.articles)
    ? obj.articles
    : Array.isArray(nestedData?.articles)
      ? nestedData.articles
      : Array.isArray(obj.items)
        ? obj.items
        : null;

  if (!candidateList) {
    throw new Error('News response did not contain an articles list.');
  }

  const articles: NewsArticle[] = [];
  for (let i = 0; i < candidateList.length; i++) {
    const item = candidateList[i];
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const title = typeof rec.title === 'string' ? rec.title.trim() : '';
    if (!title) continue;

    const rawRel = typeof rec.relevance === 'string' ? rec.relevance.toLowerCase().trim() : '';
    const relevance: NewsRelevance = VALID_NEWS_RELEVANCE.has(rawRel as NewsRelevance)
      ? (rawRel as NewsRelevance)
      : 'dns';

    const summary =
      typeof rec.summary === 'string' && rec.summary.trim() ? rec.summary.trim() : title;
    const details =
      typeof rec.details === 'string' && rec.details.trim() ? rec.details.trim() : summary;
    const categories = Array.isArray(rec.categories)
      ? rec.categories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      : [];

    articles.push({
      id: typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : `news-${i}-${title.slice(0, 16)}`,
      title,
      publisher: 'DNS Locator',
      publishedAt:
        typeof rec.publishedAt === 'string' && rec.publishedAt.trim()
          ? rec.publishedAt
          : new Date().toISOString(),
      summary,
      details,
      categories,
      relevance,
      suggestedDomain:
        typeof rec.suggestedDomain === 'string' && rec.suggestedDomain.trim()
          ? rec.suggestedDomain.trim()
          : 'www.dnslocator.online',
    });
  }

  if (articles.length === 0) {
    throw new Error('No DNS Locator news reports are available yet. Please retry.');
  }

  return {
    articles,
    fetchedAt:
      typeof obj.fetchedAt === 'string' && obj.fetchedAt.trim()
        ? obj.fetchedAt
        : new Date().toISOString(),
    cached: Boolean(obj.cached),
  };
}

type WorkspaceView = 'overview' | 'all' | 'regions';
type ThemeMode = 'light' | 'dark';

function setOrCreateMeta(selector: string, attrName: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

interface AppProps {
  initialPath?: string;
}

export default function App({ initialPath }: AppProps) {
  const { isInstalled } = usePWAInstall();
  const { lang, switchToEnglish, t } = useI18n();

  const startPath =
    initialPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const initialParsed = parseAppRoute(startPath);

  const [route, setRoute] = useState<AppRoute>(initialParsed.route);
  const [activeBlogSlug, setActiveBlogSlug] = useState<string | null>(initialParsed.blogSlug);
  const [activeRecordTool, setActiveRecordTool] = useState(initialParsed.recordTool);
  const [currentPath, setCurrentPath] = useState<string>(startPath);

  const [theme, setTheme] = useState<ThemeMode>('light');
  const [view, setView] = useState<WorkspaceView>('overview');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [consentVersion, setConsentVersion] = useState(0);
  const [isCookiePopupOpen, setIsCookiePopupOpen] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [recordType, setRecordType] = useState<DnsRecordType>(
    initialParsed.recordTool?.recordType ?? 'A'
  );
  const [expectedValue, setExpectedValue] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

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
  const [recentLookups, setRecentLookups] = useState<RecentLookupEntry[]>([]);
  const [hasTriggeredLookup, setHasTriggeredLookup] = useState(false);
  const [isGameBarOpen, setIsGameBarOpen] = useState(false);

  const [newsFeed, setNewsFeed] = useState<NewsFeedResponse | null>(null);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [newsRetryAttempt, setNewsRetryAttempt] = useState(0);
  const [newsError, setNewsError] = useState<string | null>(null);

  const debounceTimerRef = useRef<number | null>(null);
  const domainInputRef = useRef<HTMLInputElement | null>(null);
  const themeInitializedRef = useRef(false);
  const adsEnabled = isAdSenseEnabled();

  const isLoading = isPropLoading || isAllLoading;

  const sanitizedPreview = useMemo(
    () => sanitizeDomainInput(rawInput, recordType),
    [rawInput, recordType]
  );

  // Sync saved recent lookups & active theme after hydration to prevent SSR mismatch
  useEffect(() => {
    setRecentLookups(getRecentLookups());
    if (document.documentElement.classList.contains('dark')) {
      setTheme('dark');
    }
    themeInitializedRef.current = true;
  }, []);

  // Track scroll depth to reveal the Move to Top button
  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 320);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Initialize Google Analytics and Google Search Console only if env IDs are populated
  useEffect(() => {
    initializeTracking(getSavedCookieConsent().choice);
  }, []);

  // Sync theme class, localStorage, and theme-color meta tag
  useEffect(() => {
    if (!themeInitializedRef.current) return;
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
      const nextPath = window.location.pathname;
      const parsed = parseAppRoute(nextPath);
      setCurrentPath(nextPath);
      setRoute(parsed.route);
      setActiveBlogSlug(parsed.blogSlug);
      setActiveRecordTool(parsed.recordTool);
      if (parsed.recordTool) {
        setRecordType(parsed.recordTool.recordType);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Synchronize per-page title, meta description, canonical URL, OpenGraph, Twitter, robots & route JSON-LD
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasQueryDomain = params.has('domain') || params.has('q');
    const seo = getPageSeoMeta(currentPath, {
      origin: window.location.origin,
      hasSearchQuery: hasQueryDomain,
    });

    document.title = seo.title;
    setOrCreateMeta('meta[name="description"]', 'name', 'description', seo.description);
    setOrCreateMeta('meta[name="robots"]', 'name', 'robots', seo.robots);
    setOrCreateMeta('meta[property="og:type"]', 'property', 'og:type', seo.ogType);
    setOrCreateMeta('meta[property="og:url"]', 'property', 'og:url', seo.canonicalUrl);
    setOrCreateMeta('meta[property="og:title"]', 'property', 'og:title', seo.title);
    setOrCreateMeta('meta[property="og:description"]', 'property', 'og:description', seo.description);
    setOrCreateMeta('meta[property="og:image"]', 'property', 'og:image', seo.ogImage);
    setOrCreateMeta('meta[property="og:image:secure_url"]', 'property', 'og:image:secure_url', seo.ogImage);
    setOrCreateMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', seo.ogImageAlt);
    setOrCreateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', seo.title);
    setOrCreateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', seo.description);
    setOrCreateMeta('meta[name="twitter:image"]', 'name', 'twitter:image', seo.ogImage);
    setOrCreateMeta('meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt', seo.ogImageAlt);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', seo.canonicalUrl);

    // Replace JSON-LD structured data blocks for active route
    const existingLd = document.head.querySelectorAll('script[type="application/ld+json"]');
    existingLd.forEach((node) => node.remove());
    for (const schema of seo.jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-ld', 'true');
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    }

    if (seo.httpStatus === 200) {
      trackAnalyticsPageView(parseAppRoute(currentPath).cleanPath, seo.title);
    }
  }, [currentPath, route, activeBlogSlug, activeRecordTool]);

  const navigatePath = useCallback((rawTargetPath: string, hash?: string) => {
    const parsed = parseAppRoute(rawTargetPath);
    const targetUrl = `${parsed.cleanPath}${hash ?? ''}`;
    window.history.pushState({}, '', targetUrl);
    setCurrentPath(parsed.cleanPath);
    setRoute(parsed.route);
    setActiveBlogSlug(parsed.blogSlug);
    setActiveRecordTool(parsed.recordTool);
    if (parsed.recordTool) {
      setRecordType(parsed.recordTool.recordType);
    }
    if (hash) {
      window.setTimeout(() => {
        const el = document.querySelector(hash);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const navigate = useCallback(
    (nextRoute: AppRoute, hash?: string, blogSlug?: string) => {
      const nextPath =
        nextRoute === 'home'
          ? '/'
          : nextRoute === 'blog-post' && blogSlug
            ? `/blog/${blogSlug}`
            : `/${nextRoute}`;
      navigatePath(nextPath, hash);
    },
    [navigatePath]
  );

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
        revealGame?: boolean;
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

      setHasTriggeredLookup(true);
      if (opts?.revealGame) {
        setIsGameBarOpen(true);
      }

      if (parsed.wasModified && inputOverride === undefined) {
        setRawInput(parsed.domain);
      }

      setInputError(null);
      trackDnsLookupEvent(activeType);

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

  const newsRetryTimerRef = useRef<number | null>(null);
  const newsAbortRef = useRef<AbortController | null>(null);

  const fetchNews = useCallback(async (forceRefresh = false, retryAttempt = 0) => {
    if (newsRetryTimerRef.current) {
      window.clearTimeout(newsRetryTimerRef.current);
      newsRetryTimerRef.current = null;
    }
    if (newsAbortRef.current) {
      newsAbortRef.current.abort();
      newsAbortRef.current = null;
    }

    const endpoint = `/api/news${forceRefresh ? '?refresh=1' : ''}`;
    const controller = new AbortController();
    newsAbortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    setIsNewsLoading(true);
    setNewsRetryAttempt(retryAttempt);
    setNewsError(null);
    let keepLoadingForRetry = false;

    let responseStatus: number | null = null;
    let responseContentType = '';
    let responseUrl = '';
    let responseType: ResponseType | '' = '';
    let failureCategory: 'cors' | 'network' | 'server-parse' = 'network';

    try {
      const res = await fetch(endpoint, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      responseStatus = res.status;
      responseContentType = res.headers.get('content-type') || '';
      responseUrl = res.url || '';
      responseType = res.type;

      if (res.type === 'opaque') {
        failureCategory = 'cors';
        throw new Error('Cross-origin (CORS) blocked reading the news response.');
      }

      const text = await res.text();

      let json: unknown = {};
      if (text) {
        if (
          res.url.includes('__cookie_check') ||
          (responseContentType.includes('text/html') && !text.trim().startsWith('{'))
        ) {
          failureCategory = res.url.includes('__cookie_check') ? 'cors' : 'server-parse';
          throw new Error(
            res.url.includes('__cookie_check')
              ? 'Preview session verification redirected the request. Please click Retry.'
              : 'News endpoint returned HTML instead of JSON.'
          );
        }
        try {
          json = JSON.parse(text);
        } catch {
          failureCategory = 'server-parse';
          throw new Error('Unable to parse DNS Locator news JSON response.');
        }
      }

      if (!res.ok) {
        failureCategory = 'server-parse';
        const errMsg =
          json &&
          typeof json === 'object' &&
          'error' in json &&
          typeof (json as { error?: unknown }).error === 'string'
            ? (json as { error: string }).error
            : `Unable to load news updates (HTTP ${res.status}).`;
        throw new Error(errMsg);
      }

      try {
        const normalized = normalizeNewsFeedResponse(json);
        setNewsFeed(normalized);
        setNewsRetryAttempt(0);
      } catch (schemaErr) {
        failureCategory = 'server-parse';
        throw schemaErr;
      }
    } catch (err) {
      if (controller.signal.aborted && newsAbortRef.current !== controller) {
        return;
      }

      const errMessage = err instanceof Error ? err.message : String(err ?? '');
      const errName = err instanceof Error ? err.name : typeof err;

      let resolvedCategory: 'cors' | 'network' | 'server-parse' = failureCategory;
      if (responseStatus === null) {
        resolvedCategory = /cors|cross-origin|origin/i.test(errMessage) ? 'cors' : 'network';
      } else if (err instanceof SyntaxError) {
        resolvedCategory = 'server-parse';
      }

      const diagnosticDetails = {
        category: resolvedCategory,
        endpoint,
        retryAttempt,
        willRetry: retryAttempt < 2,
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        status: responseStatus,
        responseType: responseType || null,
        contentType: responseContentType || null,
        responseUrl: responseUrl || null,
        errorName: errName,
        errorMessage: errMessage,
      };

      if (retryAttempt < 2) {
        console.warn('[DNS Locator][fetchNews] Transient error, scheduling retry:', diagnosticDetails, err);
        keepLoadingForRetry = true;
        const nextAttempt = retryAttempt + 1;
        setNewsRetryAttempt(nextAttempt);
        newsRetryTimerRef.current = window.setTimeout(() => {
          void fetchNews(forceRefresh, nextAttempt);
        }, 1200 * nextAttempt);
        return;
      }

      console.error('[DNS Locator][fetchNews] Failed after retries:', diagnosticDetails, err);

      const userMessage =
        err instanceof Error && err.name === 'AbortError'
          ? 'DNS Locator news request timed out. Please click Retry.'
          : errMessage || 'Unable to load DNS Locator news right now. Please click Retry.';
      setNewsError(userMessage);
    } finally {
      window.clearTimeout(timeoutId);
      if (newsAbortRef.current === controller) {
        newsAbortRef.current = null;
      }
      if (!keepLoadingForRetry) {
        setIsNewsLoading(false);
      }
    }
  }, []);

  // Load news feed cleanly when visiting Newsroom (or prefetch on idle)
  useEffect(() => {
    if (route === 'news' && !newsFeed && !isNewsLoading && !newsError) {
      void fetchNews();
    }
  }, [route, newsFeed, isNewsLoading, newsError, fetchNews]);

  useEffect(() => {
    return () => {
      if (newsRetryTimerRef.current) {
        window.clearTimeout(newsRetryTimerRef.current);
      }
      if (newsAbortRef.current) {
        newsAbortRef.current.abort();
      }
    };
  }, []);

  // Support optional ?domain= deep links on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramDomain = params.get('domain');
    const paramType = params.get('type')?.toUpperCase() as DnsRecordType | undefined;
    if (paramDomain && (route === 'home' || route === 'record-tool')) {
      const nextType =
        activeRecordTool?.recordType ??
        (paramType && PROPAGATION_RECORD_TYPES.includes(paramType) ? paramType : 'A');
      setRawInput(paramDomain);
      setRecordType(nextType);
      executeLookup(paramDomain, { targetType: nextType });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      executeLookup(undefined, { revealGame: true });
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

  const diagnosticWorkspace = (hasTriggeredLookup || isLoading || Boolean(activeDomain)) && (
    <>
      {/* Unified Workspace View Tabs */}
      <div className="mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Diagnostic workspace views"
          className="inline-flex items-center p-1.5 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 self-start gap-1 overflow-x-auto max-w-full"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'overview'}
            onClick={() => setView('overview')}
            className={`px-4 py-2 min-h-[38px] rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
              view === 'overview'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" aria-hidden="true" />
            <span>{t('tabOverview')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'all'}
            onClick={() => setView('all')}
            className={`px-4 py-2 min-h-[38px] rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 tabular-nums cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
              view === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" aria-hidden="true" />
            <span>
              {t('tabAllRecords')}{allRecordsData ? ` (${allRecordsData.records.length})` : ''}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'regions'}
            onClick={() => setView('regions')}
            className={`px-4 py-2 min-h-[38px] rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 tabular-nums cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
              view === 'regions'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" aria-hidden="true" />
            <span>{t('tabGlobalRegions')}</span>
          </button>
        </div>

        {(activeDomain || (view === 'overview' && propagationData)) && (
          <div className="flex flex-wrap items-center gap-3.5">
            {activeDomain && (
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2.5 tabular-nums">
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200" dir="ltr">
                  {activeDomain}
                </span>
                {allRecordsData && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck
                        className={`w-4 h-4 ${
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

            {view === 'overview' && propagationData && !isPropLoading && (
              <Suspense fallback={null}>
                <DownloadReportButton
                  propagationData={propagationData}
                  zoneData={allRecordsData}
                  expectedValue={expectedValue}
                />
              </Suspense>
            )}
          </div>
        )}
      </div>

      {/* Workspace View Content */}
      {view === 'overview' && (
        <div className="space-y-8 sm:space-y-10">
          {(isAllLoading || allRecordsData) && (
            <section
              aria-label={t('liveZoneRecords')}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs sm:text-sm">
                  <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
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
                            ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                            : 'text-amber-700 dark:text-amber-400 font-semibold'
                        }
                      >
                        MX {allRecordsData.emailHealth.hasMx ? t('okLabel') : t('missingLabel')}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                      <span
                        className={
                          allRecordsData.emailHealth.hasSpf
                            ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                            : 'text-amber-700 dark:text-amber-400 font-semibold'
                        }
                      >
                        SPF {allRecordsData.emailHealth.hasSpf ? t('okLabel') : t('missingLabel')}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                      <span
                        className={
                          allRecordsData.emailHealth.hasDmarc
                            ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                            : 'text-amber-700 dark:text-amber-400 font-semibold'
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
                  className="h-9 px-3.5 rounded-lg border border-sky-200 dark:border-sky-800/80 bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100/80 dark:hover:bg-sky-900/50 text-xs font-semibold text-sky-700 dark:text-sky-300 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  {t('openFullZoneTable')}
                </button>
              </div>

              {isAllLoading && !allRecordsData ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-20 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                allRecordsData && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {ALL_ZONE_RECORD_TYPES.map((type) => {
                      const items = allRecordsData.recordsByType[type] ?? [];
                      const first = items[0];
                      const copyKey = `snap-${type}`;
                      return (
                        <div
                          key={type}
                          dir="ltr"
                          className="rounded-xl border border-slate-200/85 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/60 hover:border-sky-300 dark:hover:border-sky-700 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm p-4 flex flex-col justify-between gap-3 min-w-0 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleRecordTypeChange(type)}
                              className="inline-flex items-center gap-1.5 min-h-[30px] px-2 -ml-2 rounded-md text-xs font-mono font-bold text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:underline cursor-pointer transition-colors"
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
                                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 inline-flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  {snapshotCopiedKey === copyKey ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
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

          <Suspense fallback={<div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 h-80 animate-pulse" />}>
            <PropagationResults
              data={propagationData}
              isLoading={isPropLoading}
              error={combinedPropError}
              expectedValue={expectedValue}
              onExpectedValueChange={setExpectedValue}
              showHealthChart={false}
              selectedRegionId={selectedRegionId}
              onSelectRegion={setSelectedRegionId}
            />
          </Suspense>

          {isPropLoading && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 h-[260px] animate-pulse" />
          )}
          {!isPropLoading && propagationData && (
            <Suspense fallback={<div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 h-[260px] animate-pulse" />}>
              <GlobalHealthChart
                regions={propagationData.regions}
                expectedValue={expectedValue}
                selectedRegionId={selectedRegionId}
                onSelectRegion={setSelectedRegionId}
              />
            </Suspense>
          )}

          <Suspense fallback={null}>
            <DomainComparisonSection
              activeDomain={activeDomain}
              activeZoneData={allRecordsData}
              recentLookups={recentLookups}
            />
          </Suspense>
        </div>
      )}

      {view === 'all' && (
        <Suspense fallback={<div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 h-80 animate-pulse" />}>
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
        </Suspense>
      )}

      {view === 'regions' && (
        <Suspense fallback={<div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 h-80 animate-pulse" />}>
          <PropagationResults
            data={propagationData}
            isLoading={isPropLoading}
            error={combinedPropError}
            expectedValue={expectedValue}
            onExpectedValueChange={setExpectedValue}
            selectedRegionId={selectedRegionId}
            onSelectRegion={setSelectedRegionId}
          />
        </Suspense>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 transition-colors">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
        <div
          className={`mx-auto px-4 sm:px-6 h-16 sm:h-[68px] flex items-center justify-between gap-4 sm:gap-6 ${
            adsEnabled ? 'max-w-7xl' : 'max-w-6xl'
          }`}
        >
          {/* Zone 1: Emblem & Wordmark */}
          <div className="inline-flex items-center gap-2.5 sm:gap-3 shrink-0">
            <HeaderLogoEmblem />
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigatePath('/');
              }}
              className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 font-[var(--font-display)]"
            >
              <span className="text-emerald-700 dark:text-emerald-300">DNS</span> Locator
            </a>
          </div>

          {/* Zone 2: Desktop <a href> navigation links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigatePath('/');
                setView('overview');
              }}
              aria-current={route === 'home' ? 'page' : undefined}
              className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                route === 'home' ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : ''
              }`}
            >
              {t('navLookup')}
            </a>
            <a
              href="/blog/complete-guide-to-dns-propagation"
              onClick={(e) => {
                e.preventDefault();
                navigatePath('/blog/complete-guide-to-dns-propagation');
              }}
              aria-current={
                route === 'blog-post' && activeBlogSlug === 'complete-guide-to-dns-propagation'
                  ? 'page'
                  : undefined
              }
              className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                route === 'blog-post' && activeBlogSlug === 'complete-guide-to-dns-propagation'
                  ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                  : ''
              }`}
            >
              {t('navDnsGuide')}
            </a>
            <a
              href="/news"
              onClick={(e) => {
                e.preventDefault();
                navigatePath('/news');
              }}
              aria-current={route === 'news' ? 'page' : undefined}
              className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                route === 'news' ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : ''
              }`}
            >
              {t('navNews')}
            </a>
            <a
              href="/blog"
              onClick={(e) => {
                e.preventDefault();
                navigatePath('/blog');
              }}
              aria-current={
                route === 'blog' ||
                (route === 'blog-post' && activeBlogSlug !== 'complete-guide-to-dns-propagation')
                  ? 'page'
                  : undefined
              }
              className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                route === 'blog' ||
                (route === 'blog-post' && activeBlogSlug !== 'complete-guide-to-dns-propagation')
                  ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                  : ''
              }`}
            >
              {t('navBlog')}
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-2 shrink-0">
            {!isInstalled ? (
              <PWAInstallButton variant="header" />
            ) : (
              <button
                type="button"
                onClick={handleClearCache}
                className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                <span>{t('clearCache')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile <a href> navigation strip */}
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-slate-100 dark:border-slate-800/80 px-4 h-10 flex items-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-300 overflow-x-auto"
        >
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigatePath('/');
              setView('overview');
            }}
            className={`whitespace-nowrap shrink-0 ${
              route === 'home' ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : ''
            }`}
          >
            {t('navLookup')}
          </a>
          <a
            href="/blog/complete-guide-to-dns-propagation"
            onClick={(e) => {
              e.preventDefault();
              navigatePath('/blog/complete-guide-to-dns-propagation');
            }}
            className="whitespace-nowrap shrink-0"
          >
            {t('navDnsGuide')}
          </a>
          <a
            href="/news"
            onClick={(e) => {
              e.preventDefault();
              navigatePath('/news');
            }}
            className={`whitespace-nowrap shrink-0 ${
              route === 'news' ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : ''
            }`}
          >
            {t('navNews')}
          </a>
          <a
            href="/blog"
            onClick={(e) => {
              e.preventDefault();
              navigatePath('/blog');
            }}
            className={`whitespace-nowrap shrink-0 ${
              route === 'blog' || route === 'blog-post'
                ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                : ''
            }`}
          >
            {t('navBlog')}
          </a>
        </nav>
      </header>

      {/* Main Content */}
      <main
        className={`flex-1 w-full mx-auto px-4 sm:px-8 py-9 sm:py-12 ${
          adsEnabled ? 'max-w-7xl' : 'max-w-6xl'
        }`}
      >
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

        {route === 'gone' ? (
          <GoneTemplate
            pathname={currentPath}
            onNavigateHome={() => navigatePath('/')}
            onNavigateBlog={() => navigatePath('/blog')}
          />
        ) : route === 'not-found' ? (
          <NotFoundTemplate
            pathname={currentPath}
            onNavigateHome={() => navigatePath('/')}
            onNavigatePage={(p) => navigate(p)}
          />
        ) : (
          <>
            <AdSlotWrapper placement="top" />

            <div
              className={
                adsEnabled
                  ? 'xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-8 xl:items-start'
                  : ''
              }
            >
              <div className="min-w-0">
                {route === 'news' ? (
                  <NewsSection
                    feed={newsFeed}
                    isLoading={isNewsLoading}
                    retryAttempt={newsRetryAttempt}
                    error={newsError}
                    onRefresh={() => void fetchNews(true)}
                    onRetry={() => void fetchNews(false)}
                    onNavigateHome={() => navigatePath('/')}
                    onRunDnsCheck={(domain, nextType) => {
                      setRawInput(domain);
                      setRecordType(nextType);
                      setView('overview');
                      navigatePath('/');
                      executeLookup(domain, { targetType: nextType });
                    }}
                  />
                ) : route === 'blog' || route === 'blog-post' ? (
                  <BlogSection
                    activeSlug={activeBlogSlug}
                    onNavigateHome={() => navigatePath('/')}
                    onNavigateBlogIndex={() => navigatePath('/blog')}
                    onSelectPost={(slug) => navigatePath(`/blog/${slug}`)}
                    onNavigatePath={navigatePath}
                    onRunDnsCheck={(domain, nextType) => {
                      setRawInput(domain);
                      setRecordType(nextType);
                      setView('overview');
                      navigatePath('/');
                      executeLookup(domain, { targetType: nextType });
                    }}
                  />
                ) : route === 'record-tool' && activeRecordTool ? (
                  <RecordToolPage
                    tool={activeRecordTool}
                    rawInput={rawInput}
                    onChangeInput={setRawInput}
                    isLoading={isLoading}
                    inputError={inputError}
                    onSubmitLookup={(override) =>
                      executeLookup(override, { targetType: activeRecordTool.recordType })
                    }
                    onNavigatePath={navigatePath}
                    hasActiveResults={hasTriggeredLookup || isLoading || Boolean(activeDomain)}
                  >
                    {diagnosticWorkspace}
                  </RecordToolPage>
                ) : route !== 'home' ? (
                  <LegalPages
                    page={route as LegalPageRoute}
                    onNavigateHome={() => navigatePath('/')}
                    onNavigatePage={(p) => navigate(p)}
                    onOpenCookiePopup={() => setIsCookiePopupOpen(true)}
                  />
                ) : (
                  <>
                    {/* Hero & Workspace Controls */}
                    <section aria-labelledby="hero-heading" className="mb-10 sm:mb-12">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-7">
                        <div className="max-w-2xl">
                          <h1
                            id="hero-heading"
                            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight"
                            style={{ textWrap: 'balance' }}
                          >
                            {t('heroTitle')}
                          </h1>
                          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                            {t('heroSubtitle')}
                          </p>
                        </div>

                        {/* Language revert + Light/Dark switch + Clear Cache + Share */}
                        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
                          {lang !== 'en' && (
                            <button
                              type="button"
                              onClick={switchToEnglish}
                              className="h-10 px-3.5 rounded-xl border border-emerald-700 dark:border-emerald-400 bg-emerald-700 dark:bg-emerald-400 text-white dark:text-slate-950 hover:bg-emerald-600 dark:hover:bg-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <span>{t('englishBtn')}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                            aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
                            title={theme === 'dark' ? t('lightMode') : t('darkMode')}
                            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center justify-center transition-colors shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
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
                              className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                            >
                              <Trash2 className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                              <span>{t('clearCache')}</span>
                            </button>
                          )}

                          {activeDomain && (
                            <button
                              type="button"
                              onClick={handleCopyShareLink}
                              className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                            >
                              {shareCopied ? (
                                <>
                                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                                  <span>{t('linkCopied')}</span>
                                </>
                              ) : (
                                <>
                                  <Share2 className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
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
                        className="rounded-2xl border-2 border-sky-200/80 dark:border-sky-800/70 bg-gradient-to-br from-white via-sky-50/45 to-cyan-50/55 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/40 shadow-lg shadow-sky-900/5 dark:shadow-black/30 p-5 sm:p-8 lg:p-10 space-y-5 sm:space-y-6"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-sky-700 dark:text-sky-400">
                            <Zap className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>{t('searchCardKicker')}</span>
                          </div>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {t('searchCardMeta')}
                          </span>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-3 sm:gap-3.5">
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
                              className="w-full h-12 sm:h-15 pl-10 sm:pl-12 pr-11 sm:pr-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/90 text-sm sm:text-lg font-mono text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                            />
                            {rawInput ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setRawInput('');
                                  domainInputRef.current?.focus();
                                }}
                                aria-label="Clear domain input"
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <X className="w-4 h-4" aria-hidden="true" />
                              </button>
                            ) : (
                              <kbd
                                aria-hidden="true"
                                className="hidden sm:inline-flex items-center justify-center px-2 py-1 text-xs font-mono text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                              >
                                /
                              </kbd>
                            )}
                          </div>

                          <div className="flex flex-nowrap items-center gap-2 sm:gap-3 shrink-0 w-full lg:w-auto">
                            <label htmlFor="record-type-select" className="sr-only">
                              {t('recordTypeLabel')}
                            </label>
                            <select
                              id="record-type-select"
                              aria-label={t('recordTypeLabel')}
                              value={recordType}
                              onChange={(e) => handleRecordTypeChange(e.target.value as DnsRecordType)}
                              dir="ltr"
                              className="h-12 sm:h-15 w-[84px] sm:w-auto sm:min-w-[112px] px-2.5 sm:px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/90 text-xs sm:text-base font-mono font-bold text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer shrink-0 transition-all"
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
                              className="flex-1 lg:flex-initial min-w-0 h-12 sm:h-15 px-4 sm:px-8 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 hover:from-emerald-600 hover:via-emerald-500 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 disabled:opacity-60 text-white dark:text-slate-950 text-xs sm:text-base font-bold shadow-md shadow-emerald-700/25 dark:shadow-emerald-400/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap cursor-pointer active:scale-[0.99]"
                            >
                              <span>{isLoading ? t('checkingBtn') : t('lookupBtn')}</span>
                              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden="true" />
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
                                className="h-12 w-12 sm:h-15 sm:w-15 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center justify-center transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                              >
                                <RefreshCw
                                  className={`w-4 h-4 sm:w-5 sm:h-5 ${isLoading ? 'animate-spin' : ''}`}
                                  aria-hidden="true"
                                />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Recent Searches Bar & Permanent Play Game Button */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pt-5 border-t border-slate-200/70 dark:border-slate-800/80 text-xs sm:text-sm text-slate-500 dark:text-slate-400 min-h-[42px]">
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
                                    className="inline-flex items-center gap-2 px-3.5 py-1.5 min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white/90 dark:bg-slate-950/80 hover:border-sky-400 dark:hover:border-sky-600 hover:text-sky-700 dark:hover:text-sky-300 font-mono text-xs sm:text-sm text-slate-700 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer"
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

                          <div className="flex flex-wrap items-center justify-end gap-x-3.5 gap-y-2 shrink-0 sm:ml-auto text-xs sm:text-sm">
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
                                  className="text-sky-700 dark:text-sky-400 hover:underline font-medium cursor-pointer"
                                >
                                  {t('checkApex')} ({sanitizedPreview.apexDomain})
                                </button>
                              )}

                            <button
                              type="button"
                              onClick={() => setIsGameBarOpen((prev) => !prev)}
                              aria-expanded={isGameBarOpen}
                              aria-controls="dns-packet-game-bar"
                              className={`min-h-[36px] px-3.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                                isGameBarOpen
                                  ? 'border-emerald-300 dark:border-emerald-700/70 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-emerald-400 dark:hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-300'
                              }`}
                            >
                              <Gamepad2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                              <span>{isGameBarOpen ? 'Hide Game' : 'Play Game'}</span>
                            </button>
                          </div>
                        </div>
                      </form>

                      {inputError && !hasTriggeredLookup && !activeDomain && !isLoading && (
                        <div
                          role="alert"
                          className="mt-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/35 px-4 py-3 text-xs sm:text-sm text-rose-800 dark:text-rose-200"
                        >
                          {inputError}
                        </div>
                      )}

                      {isGameBarOpen && (
                        <div className="mt-5">
                          <Suspense fallback={<div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-56 animate-pulse" />}>
                            <DnsPacketGame
                              isSearchingDns={isLoading}
                              activeDomain={activeDomain}
                              onClose={() => setIsGameBarOpen(false)}
                            />
                          </Suspense>
                        </div>
                      )}
                    </section>

                    {/* Live Diagnostic Workspace: revealed after visitor searches a domain */}
                    {diagnosticWorkspace}

                    {/* Always-Visible 800-1500+ Word Editorial Guide, Benchmarks, Visuals & FAQ */}
                    <DnsEducationGuide onNavigatePath={navigatePath} />
                  </>
                )}
              </div>

              {adsEnabled && (
                <div className="mt-8 xl:mt-0 xl:sticky xl:top-24 shrink-0">
                  <AdSlotWrapper placement="sidebar" />
                </div>
              )}
            </div>

            <AdSlotWrapper placement="bottom" />
          </>
        )}
      </main>

      {/* Compliant Trust Footer with real <a href> links */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-16">
        <div
          className={`mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400 ${
            adsEnabled ? 'max-w-7xl' : 'max-w-6xl'
          }`}
        >
          <div className="space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              {t('footerTagline')}
            </p>
            <p>{t('footerDisclaimer')}</p>
          </div>
          <nav
            aria-label="Footer legal and information links"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 shrink-0"
          >
            <a
              href="/about"
              onClick={(e) => {
                e.preventDefault();
                navigatePath('/about');
              }}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap"
            >
              {t('navAbout')}
            </a>
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                navigatePath('/contact');
              }}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap"
            >
              {t('navContact')}
            </a>
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                navigatePath('/privacy');
              }}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap"
            >
              {t('navPrivacy')}
            </a>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                navigatePath('/terms');
              }}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap"
            >
              {t('navTerms')}
            </a>
            <a
              href="/disclaimer"
              onClick={(e) => {
                e.preventDefault();
                navigatePath('/disclaimer');
              }}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap"
            >
              {t('navDisclaimer')}
            </a>
            <a
              href="/llms.txt"
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline whitespace-nowrap font-mono"
            >
              llms.txt
            </a>
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

      {/* EU GDPR Cookie Notice Popup */}
      <CookieNoticeBanner
        consentVersion={consentVersion}
        forceOpen={isCookiePopupOpen}
        onCloseForceOpen={() => setIsCookiePopupOpen(false)}
        onNavigatePage={(p) => navigate(p)}
        onConsentSaved={() => setConsentVersion((v) => v + 1)}
      />

      <OfflineIndicator />
    </div>
  );
}
