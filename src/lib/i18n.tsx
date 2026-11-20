import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type SupportedLang =
  | 'en'
  | 'ur'
  | 'hi'
  | 'ar'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt'
  | 'zh'
  | 'ja'
  | 'tr'
  | 'id'
  | 'ru'
  | 'bn';

export interface LanguageOption {
  code: SupportedLang;
  nativeName: string;
  englishName: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', dir: 'ltr' },
  { code: 'ur', nativeName: 'اردو', englishName: 'Urdu', dir: 'rtl' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', dir: 'ltr' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', dir: 'ltr' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', dir: 'ltr' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', dir: 'ltr' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese', dir: 'ltr' },
  { code: 'zh', nativeName: '中文', englishName: 'Chinese', dir: 'ltr' },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese', dir: 'ltr' },
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', dir: 'ltr' },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', dir: 'ltr' },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian', dir: 'ltr' },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', dir: 'ltr' },
];

const LANG_STORAGE_KEY = 'dnslocator_lang';

const SUPPORTED_CODE_SET = new Set<string>(SUPPORTED_LANGUAGES.map((l) => l.code));

const TIMEZONE_TO_LANG: Record<string, SupportedLang> = {
  'Asia/Karachi': 'ur',
  'Asia/Kolkata': 'hi',
  'Asia/Calcutta': 'hi',
  'Asia/Dhaka': 'bn',
  'Asia/Riyadh': 'ar',
  'Asia/Dubai': 'ar',
  'Asia/Qatar': 'ar',
  'Asia/Kuwait': 'ar',
  'Asia/Baghdad': 'ar',
  'Asia/Beirut': 'ar',
  'Asia/Amman': 'ar',
  'Africa/Cairo': 'ar',
  'Africa/Casablanca': 'ar',
  'Asia/Tokyo': 'ja',
  'Asia/Shanghai': 'zh',
  'Asia/Hong_Kong': 'zh',
  'Asia/Taipei': 'zh',
  'Asia/Jakarta': 'id',
  'Asia/Makassar': 'id',
  'Asia/Jayapura': 'id',
  'Europe/Istanbul': 'tr',
  'Asia/Istanbul': 'tr',
  'Europe/Paris': 'fr',
  'Europe/Brussels': 'fr',
  'Europe/Berlin': 'de',
  'Europe/Zurich': 'de',
  'Europe/Vienna': 'de',
  'Europe/Madrid': 'es',
  'America/Mexico_City': 'es',
  'America/Buenos_Aires': 'es',
  'America/Argentina/Buenos_Aires': 'es',
  'America/Bogota': 'es',
  'America/Santiago': 'es',
  'America/Lima': 'es',
  'America/Sao_Paulo': 'pt',
  'Europe/Lisbon': 'pt',
  'Europe/Moscow': 'ru',
};

export function detectRegionalLanguage(): SupportedLang {
  if (typeof window === 'undefined') return 'en';

  // 1. Check navigator.languages (explicit regional languages ordered by preference)
  const navLangs = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

  for (const raw of navLangs) {
    if (!raw) continue;
    const base = raw.toLowerCase().split('-')[0];
    if (base !== 'en' && SUPPORTED_CODE_SET.has(base)) {
      return base as SupportedLang;
    }
  }

  // 2. Check regional timezone hint when browser locale defaults to generic English
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_TO_LANG[tz]) {
      return TIMEZONE_TO_LANG[tz];
    }
  } catch {
    // Ignore Intl errors
  }

  return 'en';
}

const EN_TRANSLATIONS = {
  // Navigation & Top Bar
  navOverview: 'Overview',
  navAllRecords: 'All Records',
  navDnsGuide: 'DNS Guide',
  navAbout: 'About',
  navPrivacy: 'Privacy Policy',
  navTerms: 'Terms of Service',
  navContact: 'Contact',
  clearCache: 'Clear Cache',
  lightMode: 'Light Mode',
  darkMode: 'Dark Mode',
  shareLink: 'Share Link',
  linkCopied: 'Link Copied',
  englishBtn: 'English',
  languageLabel: 'Language',

  // Hero & Search
  heroTitle: 'Global DNS Propagation & Record Lookup',
  domainPlaceholder: 'Enter domain or paste URL (e.g., https://example.com/pricing)',
  lookupBtn: 'Lookup',
  checkingBtn: 'Checking…',
  hostnameLabel: 'Hostname:',
  checkApex: 'Check apex',
  recentLabel: 'Recent:',

  // Workspace Views
  tabOverview: 'Overview',
  tabAllRecords: 'All Records',
  tabGlobalRegions: 'Global Regions (18)',
  dnssecValid: 'DNSSEC Valid',
  dnssecUnsigned: 'DNSSEC Unsigned',
  liveZoneRecords: 'Live DNS Zone Records',
  recordsFound: 'records found',
  openFullZoneTable: 'Open Full Zone Table →',
  noRecordPublished: 'No record published',
  noneLabel: 'None',
  missingLabel: 'Missing',
  okLabel: 'OK',

  // Propagation Map & Table
  statusPropagated: 'Propagated',
  statusNonPropagated: 'Non-Propagated',
  globalResolverDist: 'Global Resolver Distribution',
  queryingCheckpoints: 'Querying 18 regional DNS checkpoints…',
  emptyMapTitle: 'Global DNS Propagation Map & Regional Resolvers',
  emptyMapDesc:
    'Enter a domain above to inspect every DNS record type and verify how 18 worldwide checkpoints resolve your domain in real time.',
  featCheckpointsTitle: '18 Worldwide Checkpoints',
  featCheckpointsDesc:
    'Queries Cloudflare 1.1.1.1, AdGuard, Control D, AliDNS, IIJ Tokyo, TWNIC, DNS.SB, and regional Google ECS nodes.',
  featExpectedTitle: 'Expected Value Matching',
  featExpectedDesc:
    'Compare resolved records across regions or paste your target IP to track rollout completion.',
  featCacheTitle: 'Offline-Ready Cache & Export',
  featCacheDesc:
    '5-minute client and server TTL caching prevents redundant lookups, with one-click JSON, CSV, and BIND exports.',
  cachedLabel: 'Cached (5m)',
  liveLabel: 'Live',
  expectedPlaceholder: 'Match expected value (optional)',
  colLocation: 'Location',
  colResolver: 'Resolver',
  colResolvedValues: 'Resolved Value(s)',
  colTtl: 'TTL',
  colLatency: 'Latency',
  colStatus: 'Status',
  continentAll: 'All',
  moreRecords: 'more records',
  propagationSuffix: 'Propagation',

  // All Records Table
  allRecordsTitle: 'Parallel All-Record Zone Inspector (Cloudflare 1.1.1.1 DoH)',
  allRecordsDesc:
    "Simultaneously queries A, AAAA, CNAME, MX, TXT, NS, SOA, CAA, and DMARC records via Cloudflare's DNS over HTTPS JSON API.",
  readyZoneLookup: 'Ready for parallel zone lookup',
  readyZoneLookupDesc:
    'Enter any domain or URL above. Results include record values, TTL durations, MX priorities, DNSSEC validation, and SPF/DMARC verification.',
  filterRecordsPlaceholder: 'Filter records…',
  checkRegionsBtn: 'Check Regions',
  colType: 'Type',
  colName: 'Name',
  colPriority: 'Priority',
  colValue: 'Value',
  colCopy: 'Copy',
  configured: 'Configured',
  noneFound: 'None Found',
  present: 'Present',
  validatedAd: 'Validated (AD)',
  unsigned: 'Unsigned',
  cryptoVerified: 'Cryptographic chain verified',
  noAdSignature: 'No AD signature returned',

  // Guide
  guideKicker: 'Reference & Troubleshooting Guide',
  guideHeading: 'Understanding DNS Records, Global Propagation, and Mail Health',
  guideIntro:
    'The Domain Name System translates human-readable hostnames into IP addresses and routing metadata. When you update a DNS record at your provider, recursive resolvers worldwide cache the previous answer until its Time to Live (TTL) expires—making multi-region checks essential before declaring a launch complete.',
  guideSec1: '01. Core DNS Record Types Explained',
  guideSec2: '02. How DNS Propagation & TTL Caching Work',
  guideSec3: '03. Troubleshooting Common Domain & Email Errors',
  guideSec4: '04. Frequently Asked Questions',

  // Legal Pages (About & Privacy Policy)
  backToTool: 'Back to DNS Lookup Tool',
  aboutTitle: 'About dnslocator.online',
  aboutSubtitle: 'Independent Global DNS Propagation & Record Diagnostic Tool',
  aboutP1:
    'dnslocator.online is a free, lightweight Node.js web utility built for developers, system administrators, and website owners who need fast visibility into public DNS records and worldwide DNS propagation.',
  aboutP2:
    "In Global Propagation mode, our backend dispatches simultaneous queries across 18 geographically distributed DNS checkpoints—spanning North America, South America, Europe, Asia-Pacific, Oceania, and Africa—using public DNS over HTTPS (DoH) resolvers and regional EDNS Client Subnet (ECS) routing. In All Records mode, dnslocator.online queries A, AAAA, CNAME, MX, TXT, NS, SOA, CAA, and _dmarc records in parallel via Cloudflare's public 1.1.1.1 DoH JSON resolver.",
  nonAffiliationTitle: 'Non-Affiliation Notice',
  nonAffiliationBody:
    'dnslocator.online displays publicly available DNS zone records only. We are not affiliated with, endorsed by, or connected to ICANN, IANA, Cloudflare, Google, or any domain name registrar.',
  privacyTitle: 'Privacy Policy',
  effectiveDate: 'Effective Date: November 2026',
  privacyS1Title: '1. DNS Query Transmission & Third-Party Resolvers',
  privacyS1Body:
    "When you submit a domain name or IP address on dnslocator.online, the queried hostname is transmitted from our server to Cloudflare's public 1.1.1.1 DNS over HTTPS (DoH) resolver (cloudflare-dns.com) and to our configured regional public DNS resolvers (including Google Public DNS, AdGuard DNS, Control D, DNS.SB, IIJ Public DNS, TWNIC Quad101, and AliDNS) solely to retrieve public DNS records on your behalf.",
  privacyS2Title: '2. Rate Limiting & Short-Lived Caching',
  privacyS2Body:
    "To protect our infrastructure from automated abuse, our server temporarily processes requester IP addresses in memory using a 60-second sliding-window rate limiter. IP addresses are not persisted to a database or sold to third parties. DNS responses are cached in memory for up to 5 minutes (or the record's TTL, whichever is shorter).",
  privacyS3Title: '3. Browser Local Storage',
  privacyS3Body:
    'Your browser stores recent DNS lookup responses, theme and language preferences, and recent query history locally in localStorage for 5 minutes to avoid redundant network requests. You may clear the DNS cache at any time using the Clear Cache button.',
  privacyS4Title: '4. Contact Information & Inquiries',
  privacyS4Body:
    'If you submit a message via our Contact page, your name, email address, and message are used strictly to respond to your request.',
  termsTitle: 'Terms of Service',
  contactTitle: 'Contact dnslocator.online',
  footerTagline: 'dnslocator.online · Public DNS Propagation & Record Diagnostic Utility',
  footerDisclaimer:
    'Displays publicly available DNS records queried via Cloudflare 1.1.1.1 DoH and regional resolvers. Not affiliated with ICANN or domain registrars.',
} as const;

export type TranslationKey = keyof typeof EN_TRANSLATIONS;
type PartialTranslations = Partial<Record<TranslationKey, string>>;

const TRANSLATIONS: Record<SupportedLang, PartialTranslations> = {
  en: EN_TRANSLATIONS,
  ur: {
    navOverview: 'جائزہ',
    navAllRecords: 'تمام ریکارڈز',
    navDnsGuide: 'ڈی این ایس گائیڈ',
    navAbout: 'ہمارے بارے میں',
    navPrivacy: 'رازداری کی پالیسی',
    navTerms: 'سروس کی شرائط',
    navContact: 'رابطہ کریں',
    clearCache: 'کیش صاف کریں',
    lightMode: 'لائٹ موڈ',
    darkMode: 'ڈارک موڈ',
    shareLink: 'لنک شیئر کریں',
    linkCopied: 'لنک کاپی ہو گیا',
    englishBtn: 'English',
    languageLabel: 'زبان',
    heroTitle: 'عالمی ڈی این ایس پروپیگیشن اور ریکارڈ چیکر',
    domainPlaceholder: 'ڈومین درج کریں یا یو آر ایل پیسٹ کریں (مثال: https://example.com)',
    lookupBtn: 'تلاش کریں',
    checkingBtn: 'چیک ہو رہا ہے…',
    hostnameLabel: 'ہوسٹ نام:',
    checkApex: 'بنیادی ڈومین چیک کریں',
    recentLabel: 'حالیہ:',
    tabOverview: 'جائزہ',
    tabAllRecords: 'تمام ریکارڈز',
    tabGlobalRegions: 'عالمی خطے (18)',
    dnssecValid: 'DNSSEC درست',
    dnssecUnsigned: 'DNSSEC غیر دستخط شدہ',
    liveZoneRecords: 'لائیو ڈی این ایس زون ریکارڈز',
    recordsFound: 'ریکارڈز ملے',
    openFullZoneTable: 'مکمل زون ٹیبل کھولیں ←',
    noRecordPublished: 'کوئی ریکارڈ شائع نہیں',
    noneLabel: 'کوئی نہیں',
    missingLabel: 'غائب',
    okLabel: 'درست',
    statusPropagated: 'پروپیگیٹڈ',
    statusNonPropagated: 'نان پروپیگیٹڈ',
    globalResolverDist: 'عالمی ریزارور تقسیم',
    queryingCheckpoints: '18 عالمی ڈی این ایس چیک پوائنٹس چیک ہو رہے ہیں…',
    emptyMapTitle: 'عالمی ڈی این ایس پروپیگیشن نقشہ اور علاقائی ریزارورز',
    emptyMapDesc:
      'تمام ڈی این ایس ریکارڈز اور دنیا بھر کے 18 مقامات پر حقیقی وقت میں صورتحال دیکھنے کے لیے اوپر ڈومین درج کریں۔',
    featCheckpointsTitle: '18 عالمی چیک پوائنٹس',
    featCheckpointsDesc:
      'Cloudflare 1.1.1.1، AdGuard، Control D، AliDNS، IIJ Tokyo، TWNIC اور علاقائی Google ECS نوڈز سے براہِ راست جانچ۔',
    featExpectedTitle: 'متوقع ویلیو میچنگ',
    featExpectedDesc:
      'تمام خطوں کے ریکارڈز کا موازنہ کریں یا اپنا مطلوبہ IP درج کر کے پروپیگیشن کی تصدیق کریں۔',
    featCacheTitle: 'آف لائن کیش اور ایکسپورٹ',
    featCacheDesc:
      '5 منٹ کی کیشنگ اور ایک کلک میں JSON، CSV اور BIND زون فائل ایکسپورٹ۔',
    cachedLabel: 'کیش شدہ (5 منٹ)',
    liveLabel: 'لائیو',
    expectedPlaceholder: 'متوقع ویلیو میچ کریں (اختیاری)',
    colLocation: 'مقام',
    colResolver: 'ریزارور',
    colResolvedValues: 'حاصل شدہ ویلیوز',
    colTtl: 'TTL',
    colLatency: 'تاخیر',
    colStatus: 'حالت',
    continentAll: 'تمام',
    moreRecords: 'مزید ریکارڈز',
    propagationSuffix: 'پروپیگیشن',
    allRecordsTitle: 'متوازی آل ریکارڈ زون انسپکٹر (Cloudflare 1.1.1.1 DoH)',
    allRecordsDesc:
      'Cloudflare DNS over HTTPS کے ذریعے بیک وقت A، AAAA، CNAME، MX، TXT، NS، SOA، CAA اور DMARC ریکارڈز چیک کرتا ہے۔',
    readyZoneLookup: 'زون ریکارڈز چیک کرنے کے لیے تیار',
    readyZoneLookupDesc:
      'اوپر کوئی بھی ڈومین یا لنک درج کریں۔ نتائج میں ریکارڈ ویلیوز، TTL، MX ترجیح، DNSSEC اور SPF/DMARC کی تصدیق شامل ہے۔',
    filterRecordsPlaceholder: 'ریکارڈز فلٹر کریں…',
    checkRegionsBtn: 'خطے چیک کریں',
    colType: 'قسم',
    colName: 'نام',
    colPriority: 'ترجیح',
    colValue: 'ویلیو',
    colCopy: 'کاپی',
    configured: 'ترتیب شدہ',
    noneFound: 'کچھ نہیں ملا',
    present: 'موجود',
    validatedAd: 'تصدیق شدہ (AD)',
    unsigned: 'غیر دستخط شدہ',
    cryptoVerified: 'کرپٹوگرافک چین تصدیق شدہ',
    noAdSignature: 'AD دستخط موجود نہیں',
    guideKicker: 'حوالہ اور خرابیوں کا حل',
    guideHeading: 'ڈی این ایس ریکارڈز، عالمی پروپیگیشن اور ای میل ہیلتھ کو سمجھیں',
    guideIntro:
      'ڈومین نیم سسٹم (DNS) ویب سائٹ کے ناموں کو IP ایڈریسز میں تبدیل کرتا ہے۔ جب آپ کوئی ریکارڈ تبدیل کرتے ہیں تو دنیا بھر کے ریزارورز پچھلا ریکارڈ TTL ختم ہونے تک محفوظ رکھتے ہیں، اسی لیے عالمی جانچ ضروری ہے۔',
    guideSec1: '01. بنیادی ڈی این ایس ریکارڈ کی اقسام',
    guideSec2: '02. ڈی این ایس پروپیگیشن اور TTL کیشنگ کیسے کام کرتے ہیں',
    guideSec3: '03. عام ڈومین اور ای میل مسائل کا حل',
    guideSec4: '04. اکثر پوچھے جانے والے سوالات',
    backToTool: 'ڈی این ایس ٹول پر واپس جائیں',
    aboutTitle: 'dnslocator.online کے بارے میں',
    aboutSubtitle: 'آزاد عالمی ڈی این ایس پروپیگیشن اور ریکارڈ تشخیصی ٹول',
    aboutP1:
      'dnslocator.online ڈویلپرز، سسٹم ایڈمنسٹریٹرز اور ویب سائٹ مالکان کے لیے بنایا گیا ایک مفت اور تیز رفتار ویب ٹول ہے جو عوامی ڈی این ایس ریکارڈز اور عالمی پروپیگیشن کو فوری دکھاتا ہے۔',
    aboutP2:
      'یہ ٹول بیک وقت 18 عالمی چیک پوائنٹس اور Cloudflare 1.1.1.1 DoH کے ذریعے A، AAAA، CNAME، MX، TXT، NS، SOA، CAA اور _dmarc ریکارڈز کی جانچ کرتا ہے۔',
    nonAffiliationTitle: 'عدم وابستگی کا نوٹس',
    nonAffiliationBody:
      'dnslocator.online صرف عوامی طور پر دستیاب ڈی این ایس ریکارڈز دکھاتا ہے۔ ہمارا ICANN، IANA، Cloudflare، Google یا کسی ڈومین رجسٹرار سے کوئی الحاق نہیں ہے۔',
    privacyTitle: 'رازداری کی پالیسی',
    effectiveDate: 'نافذ العمل تاریخ: نومبر 2026',
    privacyS1Title: '1. ڈی این ایس استفسارات اور تھرڈ پارٹی ریزارورز',
    privacyS1Body:
      'جب آپ کوئی ڈومین تلاش کرتے ہیں تو وہ صرف عوامی ڈی این ایس ریکارڈز حاصل کرنے کے لیے Cloudflare 1.1.1.1 اور ہمارے مقررہ علاقائی پبلک ریزارورز کو بھیجا جاتا ہے۔',
    privacyS2Title: '2. ریٹ لمٹنگ اور عارضی کیشنگ',
    privacyS2Body:
      'سروس کو غلط استعمال سے بچانے کے لیے سرور عارضی طور پر میموری میں 60 سیکنڈ کی ریٹ لمٹ لاگو کرتا ہے۔ آپ کا IP ڈیٹا بیس میں محفوظ یا فروخت نہیں کیا جاتا۔',
    privacyS3Title: '3. براؤزر لوکل اسٹوریج',
    privacyS3Body:
      'آپ کا براؤزر تیز رفتار رسائی کے لیے 5 منٹ تک حالیہ نتائج اور زبان/تھیم کی ترجیحات localStorage میں محفوظ رکھتا ہے۔',
    privacyS4Title: '4. رابطہ کی معلومات',
    privacyS4Body:
      'رابطہ فارم کے ذریعے بھیجا گیا نام، ای میل اور پیغام صرف آپ کے سوال کا جواب دینے کے لیے استعمال ہوتا ہے۔',
    termsTitle: 'سروس کی شرائط',
    contactTitle: 'dnslocator.online سے رابطہ کریں',
    footerTagline: 'dnslocator.online · عوامی ڈی این ایس پروپیگیشن اور ریکارڈ تشخیصی سروس',
    footerDisclaimer:
      'Cloudflare 1.1.1.1 DoH اور علاقائی ریزارورز کے ذریعے عوامی ڈی این ایس ریکارڈز دکھاتا ہے۔ ICANN یا رجسٹرارز سے وابستہ نہیں ہے۔',
  },
  hi: {
    navOverview: 'अवलोकन',
    navAllRecords: 'सभी रिकॉर्ड',
    navDnsGuide: 'DNS गाइड',
    navAbout: 'हमारे बारे में',
    navPrivacy: 'गोपनीयता नीति',
    navTerms: 'सेवा की शर्तें',
    navContact: 'संपर्क करें',
    clearCache: 'कैश साफ़ करें',
    lightMode: 'लाइट मोड',
    darkMode: 'डार्क मोड',
    shareLink: 'लिंक साझा करें',
    linkCopied: 'लिंक कॉपी हुआ',
    englishBtn: 'English',
    languageLabel: 'भाषा',
    heroTitle: 'ग्लोबल DNS प्रोपेगेशन और रिकॉर्ड लुकअप',
    domainPlaceholder: 'डोमेन दर्ज करें या URL पेस्ट करें (उदा. https://example.com)',
    lookupBtn: 'जांचें',
    checkingBtn: 'जांच हो रही है…',
    hostnameLabel: 'होस्टनाम:',
    checkApex: 'मूल डोमेन जांचें',
    recentLabel: 'हाल ही में:',
    tabOverview: 'अवलोकन',
    tabAllRecords: 'सभी रिकॉर्ड',
    tabGlobalRegions: 'वैश्विक क्षेत्र (18)',
    dnssecValid: 'DNSSEC मान्य',
    dnssecUnsigned: 'DNSSEC अहस्ताक्षरित',
    liveZoneRecords: 'लाइव DNS ज़ोन रिकॉर्ड',
    recordsFound: 'रिकॉर्ड मिले',
    openFullZoneTable: 'पूर्ण ज़ोन तालिका खोलें →',
    statusPropagated: 'प्रोपेगेटेड',
    statusNonPropagated: 'नॉन-प्रोपेगेटेड',
    globalResolverDist: 'वैश्विक रिज़ॉल्वर वितरण',
    queryingCheckpoints: '18 वैश्विक DNS चेकपॉइंट की जांच हो रही है…',
    emptyMapTitle: 'ग्लोबल DNS प्रोपेगेशन मैप और क्षेत्रीय रिज़ॉल्वर',
    emptyMapDesc:
      'सभी DNS रिकॉर्ड प्रकार और दुनिया भर के 18 चेकपॉइंट पर रीयल-टाइम स्थिति देखने के लिए ऊपर डोमेन दर्ज करें।',
    cachedLabel: 'कैश्ड (5m)',
    liveLabel: 'लाइव',
    expectedPlaceholder: 'अपेक्षित मान मिलान (वैकल्पिक)',
    colLocation: 'स्थान',
    colResolver: 'रिज़ॉल्वर',
    colResolvedValues: 'प्राप्त मान',
    colTtl: 'TTL',
    colLatency: 'विलंब',
    colStatus: 'स्थिति',
    continentAll: 'सभी',
    filterRecordsPlaceholder: 'रिकॉर्ड फ़िल्टर करें…',
    backToTool: 'DNS टूल पर वापस जाएं',
    aboutTitle: 'dnslocator.online के बारे में',
    aboutSubtitle: 'स्वतंत्र वैश्विक DNS प्रोपेगेशन और रिकॉर्ड डायग्नोस्टिक टूल',
    privacyTitle: 'गोपनीयता नीति',
    effectiveDate: 'प्रभावी तिथि: नवंबर 2026',
    termsTitle: 'सेवा की शर्तें',
    contactTitle: 'dnslocator.online से संपर्क करें',
    footerTagline: 'dnslocator.online · सार्वजनिक DNS प्रोपेगेशन और रिकॉर्ड डायग्नोस्टिक टूल',
    footerDisclaimer:
      'Cloudflare 1.1.1.1 DoH और क्षेत्रीय रिज़ॉल्वर के माध्यम से सार्वजनिक DNS रिकॉर्ड दिखाता है। ICANN या रजिस्ट्रार से संबद्ध नहीं है।',
  },
  ar: {
    navOverview: 'نظرة عامة',
    navAllRecords: 'جميع السجلات',
    navDnsGuide: 'دليل DNS',
    navAbout: 'من نحن',
    navPrivacy: 'سياسة الخصوصية',
    navTerms: 'شروط الخدمة',
    navContact: 'اتصل بنا',
    clearCache: 'مسح الذاكرة المؤقتة',
    lightMode: 'الوضع الفاتح',
    darkMode: 'الوضع الداكن',
    shareLink: 'مشاركة الرابط',
    linkCopied: 'تم نسخ الرابط',
    englishBtn: 'English',
    languageLabel: 'اللغة',
    heroTitle: 'فحص انتشار DNS العالمي وسجلات النطاق',
    domainPlaceholder: 'أدخل اسم النطاق أو الصق الرابط (مثال: https://example.com)',
    lookupBtn: 'فحص',
    checkingBtn: 'جارٍ الفحص…',
    hostnameLabel: 'اسم المضيف:',
    checkApex: 'فحص النطاق الرئيسي',
    recentLabel: 'الأخيرة:',
    tabOverview: 'نظرة عامة',
    tabAllRecords: 'جميع السجلات',
    tabGlobalRegions: 'المناطق العالمية (18)',
    dnssecValid: 'DNSSEC صالح',
    dnssecUnsigned: 'DNSSEC غير موقع',
    liveZoneRecords: 'سجلات DNS المباشرة',
    recordsFound: 'سجلات موجودة',
    openFullZoneTable: 'فتح جدول السجلات الكامل ←',
    statusPropagated: 'منشور',
    statusNonPropagated: 'غير منشور',
    globalResolverDist: 'توزيع الخوادم العالمية',
    queryingCheckpoints: 'جارٍ الاستعلام من 18 نقطة فحص عالمية…',
    emptyMapTitle: 'خريطة انتشار DNS العالمية والخوادم الإقليمية',
    emptyMapDesc:
      'أدخل اسم النطاق أعلاه لفحص جميع أنواع سجلات DNS والتحقق من حالة الانتشار عبر 18 موقعاً حول العالم.',
    cachedLabel: 'مؤقت (5 دقائق)',
    liveLabel: 'مباشر',
    expectedPlaceholder: 'مطابقة القيمة المتوقعة (اختياري)',
    colLocation: 'الموقع',
    colResolver: 'المحلل',
    colResolvedValues: 'القيم المستردة',
    colTtl: 'TTL',
    colLatency: 'الاستجابة',
    colStatus: 'الحالة',
    continentAll: 'الكل',
    filterRecordsPlaceholder: 'تصفية السجلات…',
    backToTool: 'العودة إلى أداة DNS',
    aboutTitle: 'حول dnslocator.online',
    aboutSubtitle: 'أداة مستقلة لفحص انتشار DNS وسجلات النطاق عالمياً',
    privacyTitle: 'سياسة الخصوصية',
    effectiveDate: 'تاريخ السريان: نوفمبر 2026',
    termsTitle: 'شروط الخدمة',
    contactTitle: 'تواصل مع dnslocator.online',
    footerTagline: 'dnslocator.online · أداة تشخيص انتشار وسجلات DNS العامة',
    footerDisclaimer:
      'يعرض سجلات DNS العامة عبر Cloudflare 1.1.1.1 DoH والمحللات الإقليمية. غير تابع لـ ICANN أو مسجلي النطاقات.',
  },
  es: {
    navOverview: 'Resumen',
    navAllRecords: 'Todos los registros',
    navDnsGuide: 'Guía DNS',
    navAbout: 'Acerca de',
    navPrivacy: 'Política de Privacidad',
    navTerms: 'Términos de Servicio',
    navContact: 'Contacto',
    clearCache: 'Limpiar caché',
    lightMode: 'Modo claro',
    darkMode: 'Modo oscuro',
    shareLink: 'Compartir enlace',
    linkCopied: 'Enlace copiado',
    englishBtn: 'English',
    languageLabel: 'Idioma',
    heroTitle: 'Propagación DNS Global y Consulta de Registros',
    domainPlaceholder: 'Ingresa un dominio o pega una URL (ej. https://example.com)',
    lookupBtn: 'Consultar',
    checkingBtn: 'Consultando…',
    hostnameLabel: 'Host:',
    checkApex: 'Consultar dominio raíz',
    recentLabel: 'Recientes:',
    tabOverview: 'Resumen',
    tabAllRecords: 'Todos los registros',
    tabGlobalRegions: 'Regiones Globales (18)',
    liveZoneRecords: 'Registros de Zona DNS en Vivo',
    recordsFound: 'registros encontrados',
    openFullZoneTable: 'Abrir tabla completa →',
    statusPropagated: 'Propagado',
    statusNonPropagated: 'No Propagado',
    globalResolverDist: 'Distribución Global de Resolvers',
    queryingCheckpoints: 'Consultando 18 puntos DNS regionales…',
    cachedLabel: 'Caché (5m)',
    liveLabel: 'En vivo',
    expectedPlaceholder: 'Valor esperado (opcional)',
    colLocation: 'Ubicación',
    colResolver: 'Resolver',
    colResolvedValues: 'Valor(es) resueltos',
    colTtl: 'TTL',
    colLatency: 'Latencia',
    colStatus: 'Estado',
    continentAll: 'Todos',
    filterRecordsPlaceholder: 'Filtrar registros…',
    backToTool: 'Volver a la herramienta DNS',
    aboutTitle: 'Acerca de dnslocator.online',
    aboutSubtitle: 'Herramienta independiente de propagación DNS y diagnóstico de registros',
    privacyTitle: 'Política de Privacidad',
    effectiveDate: 'Fecha de vigencia: noviembre de 2026',
    termsTitle: 'Términos de Servicio',
    contactTitle: 'Contactar a dnslocator.online',
  },
  fr: {
    navOverview: 'Aperçu',
    navAllRecords: 'Tous les enregistrements',
    navDnsGuide: 'Guide DNS',
    navAbout: 'À propos',
    navPrivacy: 'Politique de confidentialité',
    navTerms: 'Conditions d’utilisation',
    navContact: 'Contact',
    clearCache: 'Vider le cache',
    lightMode: 'Mode clair',
    darkMode: 'Mode sombre',
    shareLink: 'Partager le lien',
    linkCopied: 'Lien copié',
    englishBtn: 'English',
    languageLabel: 'Langue',
    heroTitle: 'Propagation DNS Mondiale & Consultation de Zone',
    domainPlaceholder: 'Entrez un domaine ou collez une URL (ex. https://example.com)',
    lookupBtn: 'Vérifier',
    checkingBtn: 'Vérification…',
    hostnameLabel: 'Hôte :',
    checkApex: 'Vérifier le domaine racine',
    recentLabel: 'Récents :',
    tabOverview: 'Aperçu',
    tabAllRecords: 'Tous les enregistrements',
    tabGlobalRegions: 'Régions Mondiales (18)',
    liveZoneRecords: 'Enregistrements DNS en Direct',
    recordsFound: 'enregistrements trouvés',
    openFullZoneTable: 'Ouvrir le tableau complet →',
    statusPropagated: 'Propagé',
    statusNonPropagated: 'Non Propagé',
    globalResolverDist: 'Distribution Mondiale des Résolveurs',
    queryingCheckpoints: 'Interrogation de 18 points de contrôle DNS…',
    cachedLabel: 'Cache (5m)',
    liveLabel: 'Direct',
    expectedPlaceholder: 'Valeur attendue (optionnel)',
    colLocation: 'Emplacement',
    colResolver: 'Résolveur',
    colResolvedValues: 'Valeur(s) résolues',
    colTtl: 'TTL',
    colLatency: 'Latence',
    colStatus: 'Statut',
    continentAll: 'Tous',
    filterRecordsPlaceholder: 'Filtrer les enregistrements…',
    backToTool: "Retour à l'outil DNS",
    aboutTitle: 'À propos de dnslocator.online',
    aboutSubtitle: 'Outil indépendant de diagnostic et de propagation DNS mondiale',
    privacyTitle: 'Politique de confidentialité',
    effectiveDate: 'Date d’entrée en vigueur : novembre 2026',
    termsTitle: 'Conditions d’utilisation',
    contactTitle: 'Contacter dnslocator.online',
  },
  de: {
    navOverview: 'Übersicht',
    navAllRecords: 'Alle Einträge',
    navDnsGuide: 'DNS-Leitfaden',
    navAbout: 'Über uns',
    navPrivacy: 'Datenschutz',
    navTerms: 'Nutzungsbedingungen',
    navContact: 'Kontakt',
    clearCache: 'Cache leeren',
    lightMode: 'Heller Modus',
    darkMode: 'Dunkler Modus',
    shareLink: 'Link teilen',
    linkCopied: 'Link kopiert',
    englishBtn: 'English',
    languageLabel: 'Sprache',
    heroTitle: 'Globale DNS-Propagation & Record-Abfrage',
    domainPlaceholder: 'Domain eingeben oder URL einfügen (z. B. https://example.com)',
    lookupBtn: 'Prüfen',
    checkingBtn: 'Prüfung läuft…',
    hostnameLabel: 'Hostname:',
    checkApex: 'Root-Domain prüfen',
    recentLabel: 'Zuletzt:',
    tabOverview: 'Übersicht',
    tabAllRecords: 'Alle Einträge',
    tabGlobalRegions: 'Globale Regionen (18)',
    liveZoneRecords: 'Live-DNS-Zoneneinträge',
    recordsFound: 'Einträge gefunden',
    openFullZoneTable: 'Vollständige Tabelle öffnen →',
    statusPropagated: 'Propagiert',
    statusNonPropagated: 'Nicht Propagiert',
    globalResolverDist: 'Globale Resolver-Verteilung',
    queryingCheckpoints: '18 weltweite DNS-Prüfpunkte werden abgefragt…',
    cachedLabel: 'Cache (5 Min.)',
    liveLabel: 'Live',
    expectedPlaceholder: 'Erwarteten Wert abgleichen (optional)',
    colLocation: 'Standort',
    colResolver: 'Resolver',
    colResolvedValues: 'Aufgelöste Werte',
    colTtl: 'TTL',
    colLatency: 'Latenz',
    colStatus: 'Status',
    continentAll: 'Alle',
    filterRecordsPlaceholder: 'Einträge filtern…',
    backToTool: 'Zurück zum DNS-Tool',
    aboutTitle: 'Über dnslocator.online',
    aboutSubtitle: 'Unabhängiges Tool für globale DNS-Propagation und Diagnose',
    privacyTitle: 'Datenschutzerklärung',
    effectiveDate: 'Stand: November 2026',
    termsTitle: 'Nutzungsbedingungen',
    contactTitle: 'Kontakt zu dnslocator.online',
  },
  pt: {
    navOverview: 'Visão Geral',
    navAllRecords: 'Todos os Registros',
    navDnsGuide: 'Guia DNS',
    navAbout: 'Sobre',
    navPrivacy: 'Política de Privacidade',
    navTerms: 'Termos de Serviço',
    navContact: 'Contato',
    clearCache: 'Limpar Cache',
    lightMode: 'Modo Claro',
    darkMode: 'Modo Escuro',
    shareLink: 'Compartilhar Link',
    linkCopied: 'Link Copiado',
    englishBtn: 'English',
    languageLabel: 'Idioma',
    heroTitle: 'Propagação DNS Global e Consulta de Registros',
    domainPlaceholder: 'Digite o domínio ou cole a URL (ex: https://example.com)',
    lookupBtn: 'Consultar',
    checkingBtn: 'Verificando…',
    tabOverview: 'Visão Geral',
    tabAllRecords: 'Todos os Registros',
    tabGlobalRegions: 'Regiões Globais (18)',
    statusPropagated: 'Propagado',
    statusNonPropagated: 'Não Propagado',
    backToTool: 'Voltar para a ferramenta DNS',
    aboutTitle: 'Sobre o dnslocator.online',
    privacyTitle: 'Política de Privacidade',
  },
  zh: {
    navOverview: '概览',
    navAllRecords: '全部记录',
    navDnsGuide: 'DNS 指南',
    navAbout: '关于我们',
    navPrivacy: '隐私政策',
    navTerms: '服务条款',
    navContact: '联系我们',
    clearCache: '清除缓存',
    lightMode: '浅色模式',
    darkMode: '深色模式',
    shareLink: '分享链接',
    linkCopied: '链接已复制',
    englishBtn: 'English',
    languageLabel: '语言',
    heroTitle: '全球 DNS 传播与记录查询',
    domainPlaceholder: '输入域名或粘贴网址（例如 https://example.com）',
    lookupBtn: '查询',
    checkingBtn: '查询中…',
    tabOverview: '概览',
    tabAllRecords: '全部记录',
    tabGlobalRegions: '全球节点 (18)',
    liveZoneRecords: '实时 DNS 区域记录',
    recordsFound: '条记录',
    openFullZoneTable: '打开完整记录表 →',
    statusPropagated: '已生效',
    statusNonPropagated: '未生效',
    globalResolverDist: '全球解析节点分布',
    queryingCheckpoints: '正在查询 18 个全球 DNS 检查节点…',
    backToTool: '返回 DNS 查询工具',
    aboutTitle: '关于 dnslocator.online',
    privacyTitle: '隐私政策',
  },
  ja: {
    navOverview: '概要',
    navAllRecords: 'すべてのレコード',
    navDnsGuide: 'DNS ガイド',
    navAbout: 'サイトについて',
    navPrivacy: 'プライバシーポリシー',
    navTerms: '利用規約',
    navContact: 'お問い合わせ',
    clearCache: 'キャッシュ削除',
    lightMode: 'ライトモード',
    darkMode: 'ダークモード',
    shareLink: 'リンクを共有',
    linkCopied: 'コピーしました',
    englishBtn: 'English',
    languageLabel: '言語',
    heroTitle: 'グローバル DNS 伝播 & レコード検索',
    domainPlaceholder: 'ドメインを入力または URL を貼り付け (例: https://example.com)',
    lookupBtn: '検索',
    checkingBtn: '確認中…',
    tabOverview: '概要',
    tabAllRecords: 'すべてのレコード',
    tabGlobalRegions: 'グローバル地域 (18)',
    statusPropagated: '伝播済み',
    statusNonPropagated: '未伝播',
    backToTool: 'DNS ツールに戻る',
    aboutTitle: 'dnslocator.online について',
    privacyTitle: 'プライバシーポリシー',
  },
  tr: {
    navOverview: 'Genel Bakış',
    navAllRecords: 'Tüm Kayıtlar',
    navDnsGuide: 'DNS Rehberi',
    navAbout: 'Hakkında',
    navPrivacy: 'Gizlilik Politikası',
    navTerms: 'Kullanım Şartları',
    navContact: 'İletişim',
    clearCache: 'Önbelleği Temizle',
    lightMode: 'Açık Mod',
    darkMode: 'Koyu Mod',
    shareLink: 'Bağlantıyı Paylaş',
    linkCopied: 'Bağlantı Kopyalandı',
    englishBtn: 'English',
    languageLabel: 'Dil',
    heroTitle: 'Küresel DNS Yayılımı ve Kayıt Sorgulama',
    domainPlaceholder: 'Alan adı girin veya URL yapıştırın (örn. https://example.com)',
    lookupBtn: 'Sorgula',
    checkingBtn: 'Kontrol ediliyor…',
    tabOverview: 'Genel Bakış',
    tabAllRecords: 'Tüm Kayıtlar',
    tabGlobalRegions: 'Küresel Bölgeler (18)',
    statusPropagated: 'Yayıldı',
    statusNonPropagated: 'Yayılmadı',
    backToTool: 'DNS Aracına Dön',
    aboutTitle: 'dnslocator.online Hakkında',
    privacyTitle: 'Gizlilik Politikası',
  },
  id: {
    navOverview: 'Ringkasan',
    navAllRecords: 'Semua Catatan',
    navDnsGuide: 'Panduan DNS',
    navAbout: 'Tentang',
    navPrivacy: 'Kebijakan Privasi',
    navTerms: 'Ketentuan Layanan',
    navContact: 'Kontak',
    clearCache: 'Hapus Cache',
    lightMode: 'Mode Terang',
    darkMode: 'Mode Gelap',
    shareLink: 'Bagikan Tautan',
    linkCopied: 'Tautan Disalin',
    englishBtn: 'English',
    languageLabel: 'Bahasa',
    heroTitle: 'Pemeriksa Propagasi DNS Global & Catatan DNS',
    domainPlaceholder: 'Masukkan domain atau tempel URL (cth: https://example.com)',
    lookupBtn: 'Periksa',
    checkingBtn: 'Memeriksa…',
    tabOverview: 'Ringkasan',
    tabAllRecords: 'Semua Catatan',
    tabGlobalRegions: 'Wilayah Global (18)',
    statusPropagated: 'Terpropagasi',
    statusNonPropagated: 'Belum Terpropagasi',
    backToTool: 'Kembali ke Alat DNS',
    aboutTitle: 'Tentang dnslocator.online',
    privacyTitle: 'Kebijakan Privasi',
  },
  ru: {
    navOverview: 'Обзор',
    navAllRecords: 'Все записи',
    navDnsGuide: 'Справочник DNS',
    navAbout: 'О сервисе',
    navPrivacy: 'Политика конфиденциальности',
    navTerms: 'Условия использования',
    navContact: 'Контакты',
    clearCache: 'Очистить кэш',
    lightMode: 'Светлая тема',
    darkMode: 'Тёмная тема',
    shareLink: 'Поделиться ссылкой',
    linkCopied: 'Ссылка скопирована',
    englishBtn: 'English',
    languageLabel: 'Язык',
    heroTitle: 'Глобальное распространение DNS и поиск записей',
    domainPlaceholder: 'Введите домен или вставьте URL (напр. https://example.com)',
    lookupBtn: 'Проверить',
    checkingBtn: 'Проверка…',
    tabOverview: 'Обзор',
    tabAllRecords: 'Все записи',
    tabGlobalRegions: 'Регионы мира (18)',
    statusPropagated: 'Распространено',
    statusNonPropagated: 'Не распространено',
    backToTool: 'Вернуться к инструменту DNS',
    aboutTitle: 'О dnslocator.online',
    privacyTitle: 'Политика конфиденциальности',
  },
  bn: {
    navOverview: 'সংক্ষিপ্ত বিবরণ',
    navAllRecords: 'সব রেকর্ড',
    navDnsGuide: 'DNS গাইড',
    navAbout: 'আমাদের সম্পর্কে',
    navPrivacy: 'গোপনীয়তা নীতি',
    navTerms: 'ব্যবহারের শর্তাবলী',
    navContact: 'যোগাযোগ',
    clearCache: 'ক্যাশ মুছুন',
    lightMode: 'লাইট মোড',
    darkMode: 'ডার্ক মোড',
    shareLink: 'লিঙ্ক শেয়ার করুন',
    linkCopied: 'লিঙ্ক কপি হয়েছে',
    englishBtn: 'English',
    languageLabel: 'ভাষা',
    heroTitle: 'গ্লোবাল DNS প্রোপাগেশন ও রেকর্ড লুকআপ',
    domainPlaceholder: 'ডোমেইন লিখুন বা URL পেস্ট করুন (যেমন https://example.com)',
    lookupBtn: 'যাচাই করুন',
    checkingBtn: 'যাচাই চলছে…',
    tabOverview: 'সংক্ষিপ্ত বিবরণ',
    tabAllRecords: 'সব রেকর্ড',
    tabGlobalRegions: 'বিশ্বব্যাপী অঞ্চল (18)',
    statusPropagated: 'প্রোপাগেটেড',
    statusNonPropagated: 'নন-প্রোপাগেটেড',
    backToTool: 'DNS টুলে ফিরে যান',
    aboutTitle: 'dnslocator.online সম্পর্কে',
    privacyTitle: 'গোপনীয়তা নীতি',
  },
};

interface I18nContextValue {
  lang: SupportedLang;
  detectedLang: SupportedLang;
  dir: 'ltr' | 'rtl';
  setLang: (lang: SupportedLang) => void;
  switchToEnglish: () => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [detectedLang] = useState<SupportedLang>(() => detectRegionalLanguage());
  const [lang, setLangState] = useState<SupportedLang>(() => {
    try {
      const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (saved && SUPPORTED_CODE_SET.has(saved)) {
        return saved as SupportedLang;
      }
    } catch {
      // Ignore storage errors
    }
    return detectedLang;
  });

  const dir = useMemo<'ltr' | 'rtl'>(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.dir ?? 'ltr';
  }, [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((nextLang: SupportedLang) => {
    setLangState(nextLang);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    } catch {
      // Ignore storage failures
    }
  }, []);

  const switchToEnglish = useCallback(() => {
    setLang('en');
  }, [setLang]);

  const t = useCallback(
    (key: TranslationKey): string => {
      return TRANSLATIONS[lang]?.[key] ?? EN_TRANSLATIONS[key];
    },
    [lang]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      detectedLang,
      dir,
      setLang,
      switchToEnglish,
      t,
    }),
    [lang, detectedLang, dir, setLang, switchToEnglish, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
