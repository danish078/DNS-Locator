import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type SupportedLang = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ru';

export interface LanguageOption {
  code: SupportedLang;
  nativeName: string;
  englishName: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', dir: 'ltr' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', dir: 'ltr' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', dir: 'ltr' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', dir: 'ltr' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese', dir: 'ltr' },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian', dir: 'ltr' },
];

const LANG_STORAGE_KEY = 'dnslocator_lang';
const LANG_ENGLISH_OVERRIDE_KEY = 'dnslocator_lang_english_override';

const SUPPORTED_CODE_SET = new Set<string>(SUPPORTED_LANGUAGES.map((l) => l.code));

const COUNTRY_TO_LANG: Record<string, SupportedLang> = {
  // Spanish
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  VE: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  UY: 'es',
  GQ: 'es',
  // French
  FR: 'fr',
  BE: 'fr',
  MC: 'fr',
  LU: 'fr',
  SN: 'fr',
  CI: 'fr',
  CM: 'fr',
  CD: 'fr',
  MG: 'fr',
  ML: 'fr',
  BF: 'fr',
  NE: 'fr',
  TG: 'fr',
  BJ: 'fr',
  GA: 'fr',
  CG: 'fr',
  HT: 'fr',
  // German
  DE: 'de',
  AT: 'de',
  CH: 'de',
  LI: 'de',
  // Portuguese
  BR: 'pt',
  PT: 'pt',
  AO: 'pt',
  MZ: 'pt',
  CV: 'pt',
  // Russian
  RU: 'ru',
  BY: 'ru',
};

function mapCountryToSupportedLang(countryCode: string | null | undefined): SupportedLang {
  if (!countryCode) return 'en';
  const mapped = COUNTRY_TO_LANG[countryCode.trim().toUpperCase()];
  return mapped && SUPPORTED_CODE_SET.has(mapped) ? mapped : 'en';
}

const EN_TRANSLATIONS = {
  // Navigation & Top Bar
  navOverview: 'Overview',
  navAllRecords: 'All Records',
  navDnsGuide: 'DNS Guide',
  navBlog: 'Blog',
  navAbout: 'About',
  navContact: 'Contact',
  navPrivacy: 'Privacy Policy',
  navTerms: 'Terms and Conditions',
  navDisclaimer: 'Disclaimer',
  navCookiesPolicy: 'Cookies Policy',
  navCookiesNotice: 'Cookies Notice',
  clearCache: 'Clear Cache',
  lightMode: 'Light Mode',
  darkMode: 'Dark Mode',
  shareLink: 'Share Link',
  linkCopied: 'Link Copied',
  englishBtn: 'English',

  // Hero & Search
  heroTitle: 'Global DNS Propagation & Record Lookup',
  heroSubtitle: 'Verify live DNS records across 18 global regions in seconds.',
  searchCardKicker: 'Instant Global DNS Radar — Complete Zone & 18-Region Check',
  searchCardMeta: '18 Regions · All Records · Live TTL',
  domainPlaceholder: 'Enter domain or paste URL (e.g., https://www.dnslocator.online)',
  recordTypeLabel: 'DNS Record Type',
  lookupBtn: 'Lookup',
  checkingBtn: 'Checking…',
  hostnameLabel: 'Hostname:',
  checkApex: 'Check apex',
  recentLabel: 'Recent searches:',
  noRecentSearches: 'No recent searches yet.',

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
    'Queries 1.1.1.1 Anycast, Google Public DNS, AdGuard, Control D, AliDNS, IIJ Tokyo, TWNIC, and DNS.SB regional nodes.',
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
  allRecordsTitle: 'Parallel All-Record Zone Inspector (DoH)',
  allRecordsDesc:
    'Simultaneously queries A, AAAA, CNAME, MX, TXT, NS, SOA, CAA, and DMARC records via DNS over HTTPS.',
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

  // Legal Pages
  backToTool: 'Back to DNS Lookup Tool',
  aboutTitle: 'About DNS Locator',
  aboutSubtitle: 'Independent Global DNS Propagation & Record Diagnostic Tool',
  aboutP1:
    'DNS Locator is a free, lightweight Node.js web utility built for developers, system administrators, and website owners who need fast visibility into public DNS records and worldwide DNS propagation.',
  aboutP2:
    'In Global Propagation mode, our backend dispatches simultaneous queries across 18 geographically distributed DNS checkpoints—spanning North America, South America, Europe, Asia-Pacific, Oceania, and Africa—using public DNS over HTTPS (DoH) resolvers and regional EDNS Client Subnet (ECS) routing. In All Records mode, DNS Locator queries A, AAAA, CNAME, MX, TXT, NS, SOA, CAA, and _dmarc records in parallel via a public 1.1.1.1 DoH JSON resolver.',
  nonAffiliationTitle: 'Non-Affiliation Notice',
  nonAffiliationBody:
    'DNS Locator displays publicly available DNS zone records only. We are not affiliated with, endorsed by, or connected to ICANN, IANA, or any domain name registrar.',
  privacyTitle: 'Privacy Policy',
  effectiveDate: 'Effective Date: November 2026',
  privacyS1Title: '1. DNS Query Transmission & Third-Party Resolvers',
  privacyS1Body:
    'When you submit a domain name or IP address on DNS Locator, the queried hostname is transmitted from our server to public 1.1.1.1 DNS over HTTPS (DoH) resolvers and to our configured regional public DNS resolvers (including Google Public DNS, AdGuard DNS, Control D, DNS.SB, IIJ Public DNS, TWNIC Quad101, and AliDNS) solely to retrieve public DNS records on your behalf.',
  privacyS2Title: '3. Rate Limiting & Short-Lived Caching',
  privacyS2Body:
    "To protect our infrastructure from automated abuse, our server temporarily processes requester IP addresses in memory using a 60-second sliding-window rate limiter. IP addresses are not persisted to a database or sold to third parties. DNS responses are cached in memory for up to 5 minutes (or the record's TTL, whichever is shorter).",
  privacyS3Title: '6. Browser Local Storage & Cookies',
  privacyS3Body:
    'Your browser stores recent DNS lookup responses, theme and language preferences, GDPR consent state, and recent query history locally in localStorage to avoid redundant network requests. You may clear the DNS cache at any time using the Clear Cache button or manage preferences via the Cookies Notice popup.',
  privacyS4Title: '7. Contact Information & GDPR Inquiries',
  privacyS4Body:
    'If you submit a message or GDPR request via our Contact page, your name, email address, and message are used strictly to respond to your inquiry.',
  termsTitle: 'Terms and Conditions',
  contactTitle: 'Contact DNS Locator',
  footerTagline: 'DNS Locator · Public DNS Propagation & Record Diagnostic Utility',
  footerDisclaimer:
    'Displays publicly available DNS records queried via public DoH and regional resolvers. Not affiliated with ICANN or domain registrars.',
} as const;

export type TranslationKey = keyof typeof EN_TRANSLATIONS;
type PartialTranslations = Partial<Record<TranslationKey, string>>;

const TRANSLATIONS: Record<SupportedLang, PartialTranslations> = {
  en: EN_TRANSLATIONS,
  es: {
    navOverview: 'Resumen',
    navAllRecords: 'Todos los registros',
    navDnsGuide: 'Guía DNS',
    navAbout: 'Acerca de',
    navPrivacy: 'Política de Privacidad',
    navTerms: 'Términos y Condiciones',
    navDisclaimer: 'Descargo de responsabilidad',
    navCookiesPolicy: 'Política de Cookies',
    navCookiesNotice: 'Aviso de Cookies',
    navContact: 'Contacto',
    clearCache: 'Limpiar caché',
    lightMode: 'Modo claro',
    darkMode: 'Modo oscuro',
    shareLink: 'Compartir enlace',
    linkCopied: 'Enlace copiado',
    englishBtn: 'English',
    heroTitle: 'Propagación DNS Global y Consulta de Registros',
    heroSubtitle: 'Verifica registros DNS en vivo en 18 regiones del mundo en segundos.',
    searchCardKicker: 'Radar DNS Global Instantáneo — Zona Completa y 18 Regiones',
    searchCardMeta: '18 Regiones · Todos los Registros · TTL en Vivo',
    domainPlaceholder: 'Ingresa un dominio o pega una URL (ej. https://www.dnslocator.online)',
    recordTypeLabel: 'Tipo de registro DNS',
    lookupBtn: 'Consultar',
    checkingBtn: 'Consultando…',
    hostnameLabel: 'Host:',
    checkApex: 'Consultar dominio raíz',
    recentLabel: 'Búsquedas recientes:',
    noRecentSearches: 'Aún no hay búsquedas recientes.',
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
    aboutTitle: 'Acerca de DNS Locator',
    aboutSubtitle: 'Herramienta independiente de propagación DNS y diagnóstico de registros',
    privacyTitle: 'Política de Privacidad',
    effectiveDate: 'Fecha de vigencia: noviembre de 2026',
    termsTitle: 'Términos y Condiciones',
    contactTitle: 'Contactar a DNS Locator',
  },
  fr: {
    navOverview: 'Aperçu',
    navAllRecords: 'Tous les enregistrements',
    navDnsGuide: 'Guide DNS',
    navAbout: 'À propos',
    navPrivacy: 'Politique de confidentialité',
    navTerms: 'Conditions générales',
    navDisclaimer: 'Avertissement',
    navCookiesPolicy: 'Politique de cookies',
    navCookiesNotice: 'Avis sur les cookies',
    navContact: 'Contact',
    clearCache: 'Vider le cache',
    lightMode: 'Mode clair',
    darkMode: 'Mode sombre',
    shareLink: 'Partager le lien',
    linkCopied: 'Lien copié',
    englishBtn: 'English',
    heroTitle: 'Propagation DNS Mondiale & Consultation de Zone',
    heroSubtitle: 'Vérifiez vos enregistrements DNS en direct dans 18 régions en quelques secondes.',
    searchCardKicker: 'Radar DNS Mondial Instantané — Zone Complète & 18 Régions',
    searchCardMeta: '18 Régions · Tous les Enregistrements · TTL en Direct',
    domainPlaceholder: 'Entrez un domaine ou collez une URL (ex. https://www.dnslocator.online)',
    recordTypeLabel: 'Type d’enregistrement DNS',
    lookupBtn: 'Vérifier',
    checkingBtn: 'Vérification…',
    hostnameLabel: 'Hôte :',
    checkApex: 'Vérifier le domaine racine',
    recentLabel: 'Recherches récentes :',
    noRecentSearches: 'Aucune recherche récente.',
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
    aboutTitle: 'À propos de DNS Locator',
    aboutSubtitle: 'Outil indépendant de diagnostic et de propagation DNS mondiale',
    privacyTitle: 'Politique de confidentialité',
    effectiveDate: 'Date d’entrée en vigueur : novembre 2026',
    termsTitle: 'Conditions générales',
    contactTitle: 'Contacter DNS Locator',
  },
  de: {
    navOverview: 'Übersicht',
    navAllRecords: 'Alle Einträge',
    navDnsGuide: 'DNS-Leitfaden',
    navAbout: 'Über uns',
    navPrivacy: 'Datenschutz',
    navTerms: 'Allgemeine Geschäftsbedingungen',
    navDisclaimer: 'Haftungsausschluss',
    navCookiesPolicy: 'Cookie-Richtlinie',
    navCookiesNotice: 'Cookie-Hinweis',
    navContact: 'Kontakt',
    clearCache: 'Cache leeren',
    lightMode: 'Heller Modus',
    darkMode: 'Dunkler Modus',
    shareLink: 'Link teilen',
    linkCopied: 'Link kopiert',
    englishBtn: 'English',
    heroTitle: 'Globale DNS-Propagation & Record-Abfrage',
    heroSubtitle: 'Prüfe Live-DNS-Einträge in 18 weltweiten Regionen in Sekunden.',
    searchCardKicker: 'Sofortiges Globales DNS-Radar — Komplette Zone & 18 Regionen',
    searchCardMeta: '18 Regionen · Alle Einträge · Live-TTL',
    domainPlaceholder: 'Domain eingeben oder URL einfügen (z. B. https://www.dnslocator.online)',
    recordTypeLabel: 'DNS-Eintragstyp',
    lookupBtn: 'Prüfen',
    checkingBtn: 'Prüfung läuft…',
    hostnameLabel: 'Hostname:',
    checkApex: 'Root-Domain prüfen',
    recentLabel: 'Letzte Suchen:',
    noRecentSearches: 'Noch keine letzten Suchen.',
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
    aboutTitle: 'Über DNS Locator',
    aboutSubtitle: 'Unabhängiges Tool für globale DNS-Propagation und Diagnose',
    privacyTitle: 'Datenschutzerklärung',
    effectiveDate: 'Stand: November 2026',
    termsTitle: 'Allgemeine Geschäftsbedingungen',
    contactTitle: 'Kontakt zu DNS Locator',
  },
  pt: {
    navOverview: 'Visão Geral',
    navAllRecords: 'Todos os Registros',
    navDnsGuide: 'Guia DNS',
    navAbout: 'Sobre',
    navPrivacy: 'Política de Privacidade',
    navTerms: 'Termos e Condições',
    navDisclaimer: 'Aviso Legal',
    navCookiesPolicy: 'Política de Cookies',
    navCookiesNotice: 'Aviso de Cookies',
    navContact: 'Contato',
    clearCache: 'Limpar Cache',
    lightMode: 'Modo Claro',
    darkMode: 'Modo Escuro',
    shareLink: 'Compartilhar Link',
    linkCopied: 'Link Copiado',
    englishBtn: 'English',
    heroTitle: 'Propagação DNS Global e Consulta de Registros',
    heroSubtitle: 'Verifique registros DNS ao vivo em 18 regiões globais em segundos.',
    searchCardKicker: 'Radar DNS Global Instantâneo — Zona Completa e 18 Regiões',
    searchCardMeta: '18 Regiões · Todos os Registros · TTL ao Vivo',
    domainPlaceholder: 'Digite o domínio ou cole a URL (ex: https://www.dnslocator.online)',
    recordTypeLabel: 'Tipo de Registro DNS',
    lookupBtn: 'Consultar',
    checkingBtn: 'Verificando…',
    hostnameLabel: 'Host:',
    checkApex: 'Consultar domínio raiz',
    recentLabel: 'Pesquisas recentes:',
    noRecentSearches: 'Nenhuma pesquisa recente ainda.',
    tabOverview: 'Visão Geral',
    tabAllRecords: 'Todos os Registros',
    tabGlobalRegions: 'Regiões Globais (18)',
    liveZoneRecords: 'Registros de Zona DNS ao Vivo',
    recordsFound: 'registros encontrados',
    openFullZoneTable: 'Abrir tabela completa →',
    statusPropagated: 'Propagado',
    statusNonPropagated: 'Não Propagado',
    globalResolverDist: 'Distribuição Global de Resolvers',
    queryingCheckpoints: 'Consultando 18 pontos DNS regionais…',
    cachedLabel: 'Cache (5m)',
    liveLabel: 'Ao vivo',
    expectedPlaceholder: 'Valor esperado (opcional)',
    colLocation: 'Localização',
    colResolver: 'Resolver',
    colResolvedValues: 'Valor(es) resolvidos',
    colTtl: 'TTL',
    colLatency: 'Latência',
    colStatus: 'Status',
    continentAll: 'Todos',
    filterRecordsPlaceholder: 'Filtrar registros…',
    backToTool: 'Voltar para a ferramenta DNS',
    aboutTitle: 'Sobre o DNS Locator',
    aboutSubtitle: 'Ferramenta independente de propagação DNS global e diagnóstico',
    privacyTitle: 'Política de Privacidade',
    effectiveDate: 'Data de vigência: novembro de 2026',
    termsTitle: 'Termos e Condições',
    contactTitle: 'Contato DNS Locator',
  },
  ru: {
    navOverview: 'Обзор',
    navAllRecords: 'Все записи',
    navDnsGuide: 'Справочник DNS',
    navAbout: 'О сервисе',
    navPrivacy: 'Политика конфиденциальности',
    navTerms: 'Условия и положения',
    navDisclaimer: 'Отказ от ответственности',
    navCookiesPolicy: 'Политика в отношении файлов cookie',
    navCookiesNotice: 'Уведомление о файлах cookie',
    navContact: 'Контакты',
    clearCache: 'Очистить кэш',
    lightMode: 'Светлая тема',
    darkMode: 'Тёмная тема',
    shareLink: 'Поделиться ссылкой',
    linkCopied: 'Ссылка скопирована',
    englishBtn: 'English',
    heroTitle: 'Глобальное распространение DNS и поиск записей',
    heroSubtitle: 'Проверяйте DNS-записи в 18 регионах мира в реальном времени за секунды.',
    searchCardKicker: 'Мгновенный глобальный DNS-радар — вся зона и 18 регионов',
    searchCardMeta: '18 регионов · Все записи · Живой TTL',
    domainPlaceholder: 'Введите домен или вставьте URL (напр. https://www.dnslocator.online)',
    recordTypeLabel: 'Тип DNS-записи',
    lookupBtn: 'Проверить',
    checkingBtn: 'Проверка…',
    hostnameLabel: 'Хост:',
    checkApex: 'Проверить корневой домен',
    recentLabel: 'Недавние поиски:',
    noRecentSearches: 'Недавних поисков пока нет.',
    tabOverview: 'Обзор',
    tabAllRecords: 'Все записи',
    tabGlobalRegions: 'Регионы мира (18)',
    liveZoneRecords: 'DNS-записи зоны в реальном времени',
    recordsFound: 'записей найдено',
    openFullZoneTable: 'Открыть полную таблицу →',
    statusPropagated: 'Распространено',
    statusNonPropagated: 'Не распространено',
    globalResolverDist: 'Глобальное распределение резолверов',
    queryingCheckpoints: 'Опрос 18 региональных DNS-узлов…',
    cachedLabel: 'Кэш (5 мин)',
    liveLabel: 'В реальном времени',
    expectedPlaceholder: 'Ожидаемое значение (необязательно)',
    colLocation: 'Локация',
    colResolver: 'Резолвер',
    colResolvedValues: 'Значение(я)',
    colTtl: 'TTL',
    colLatency: 'Задержка',
    colStatus: 'Статус',
    continentAll: 'Все',
    filterRecordsPlaceholder: 'Фильтр записей…',
    backToTool: 'Вернуться к инструменту DNS',
    aboutTitle: 'О сервисе DNS Locator',
    aboutSubtitle: 'Независимый инструмент проверки глобального распространения DNS',
    privacyTitle: 'Политика конфиденциальности',
    effectiveDate: 'Дата вступления в силу: ноябрь 2026 г.',
    termsTitle: 'Условия и положения',
    contactTitle: 'Связаться с DNS Locator',
  },
};

interface I18nContextValue {
  lang: SupportedLang;
  dir: 'ltr' | 'rtl';
  setLang: (lang: SupportedLang) => void;
  switchToEnglish: () => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<SupportedLang>(() => {
    try {
      const override = window.localStorage.getItem(LANG_ENGLISH_OVERRIDE_KEY);
      if (override === '1') return 'en';
      const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (saved && SUPPORTED_CODE_SET.has(saved)) {
        return saved as SupportedLang;
      }
    } catch {
      // Ignore storage errors
    }
    return 'en';
  });

  // Detect regional language strictly via visitor IP unless user explicitly clicked English
  useEffect(() => {
    let cancelled = false;
    try {
      if (window.localStorage.getItem(LANG_ENGLISH_OVERRIDE_KEY) === '1') {
        return;
      }
    } catch {
      // Ignore storage errors
    }

    const detectViaIp = async () => {
      let resolvedLang: SupportedLang | null = null;

      try {
        const res = await fetch('/api/geo-lang', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as {
            countryCode?: string | null;
            lang?: string | null;
          };
          if (data.lang && SUPPORTED_CODE_SET.has(data.lang)) {
            resolvedLang = data.lang as SupportedLang;
          } else if (data.countryCode) {
            resolvedLang = mapCountryToSupportedLang(data.countryCode);
          }
        }
      } catch {
        // Ignore network error and try client IP lookup fallback
      }

      // If server saw a private/local IP without proxy geo headers, check visitor public IP directly
      if (resolvedLang === null) {
        try {
          const controller = new AbortController();
          const timer = window.setTimeout(() => controller.abort(), 2000);
          const geoRes = await fetch('https://get.geojs.io/v1/ip/country.json', {
            signal: controller.signal,
          });
          window.clearTimeout(timer);
          if (geoRes.ok) {
            const geo = (await geoRes.json()) as { country?: string };
            if (geo.country) {
              resolvedLang = mapCountryToSupportedLang(geo.country);
            }
          }
        } catch {
          // Ignore client geo timeout
        }
      }

      if (!cancelled && resolvedLang && SUPPORTED_CODE_SET.has(resolvedLang)) {
        setLangState(resolvedLang);
        try {
          window.localStorage.setItem(LANG_STORAGE_KEY, resolvedLang);
        } catch {
          // Ignore storage error
        }
      }
    };

    detectViaIp();
    return () => {
      cancelled = true;
    };
  }, []);

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
      if (nextLang === 'en') {
        window.localStorage.setItem(LANG_ENGLISH_OVERRIDE_KEY, '1');
      } else {
        window.localStorage.removeItem(LANG_ENGLISH_OVERRIDE_KEY);
      }
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
      dir,
      setLang,
      switchToEnglish,
      t,
    }),
    [lang, dir, setLang, switchToEnglish, t]
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
